import { getTranslations, getLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addDays } from "date-fns";
import { LayoutDashboard, Scale, Building2, FileSignature, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ExecutiveKpiCards } from "@/components/dashboard/ExecutiveKpiCards";
import { LawsuitsByCourtChart } from "@/components/dashboard/LawsuitsByCourtChart";
import { ExportBoardReportButton } from "@/components/dashboard/ExportBoardReportButton";
import { isManagerOrAbove } from "@/lib/rbac";

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  const locale = await getLocale();
  const session = await auth();
  const now = new Date();
  const thirtyDaysFromNow = addDays(now, 30);

  const [
    activeLawsuits,
    pendingGafiTasks,
    activeContractsAggregate,
    expiringGuarantees,
    lawsuitsByCourt,
  ] = await Promise.all([
    prisma.lawsuit.count(),
    prisma.gAFITask.count({
      where: { status: { in: ["PENDING", "IN_PROGRESS"] } },
    }),
    prisma.contract.aggregate({
      where: { status: "ACTIVE" },
      _sum: { totalValue: true },
    }),
    prisma.contract.count({
      where: {
        status: "ACTIVE",
        guaranteeExpiryDate: {
          gte: now,
          lte: thirtyDaysFromNow,
        },
      },
    }),
    prisma.lawsuit.groupBy({
      by: ["courtName"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),
  ]);

  const totalContractsValue = Number(activeContractsAggregate._sum.totalValue ?? 0);
  const formattedContractsValue = new Intl.NumberFormat(
    locale === "ar" ? "ar-EG" : "en-US",
    { maximumFractionDigits: 0 }
  ).format(totalContractsValue);

  const chartData = lawsuitsByCourt.map((row) => ({
    courtName: row.courtName,
    count: row._count.id,
  }));

  const canExport = session?.user ? isManagerOrAbove(session.user.role) : false;

  const kpis = [
    {
      key: "lawsuits",
      title: t("activeLawsuits"),
      value: String(activeLawsuits),
      icon: Scale,
    },
    {
      key: "gafi",
      title: t("pendingGafiTasks"),
      value: String(pendingGafiTasks),
      icon: Building2,
    },
    {
      key: "contracts",
      title: t("activeContractsValue"),
      value: `${formattedContractsValue} ${t("egp")}`,
      icon: FileSignature,
    },
    {
      key: "guarantees",
      title: t("expiringGuarantees"),
      value: String(expiringGuarantees),
      icon: AlertTriangle,
      radar: expiringGuarantees > 0,
    },
  ];

  return (
    <div className="space-y-6" dir={locale === "ar" ? "rtl" : "ltr"}>
      <PageHeader
        title={t("executiveTitle")}
        description={t("welcome", { name: session?.user?.name ?? "" })}
        icon={LayoutDashboard}
        action={<ExportBoardReportButton canExport={canExport} />}
      />

      <ExecutiveKpiCards kpis={kpis} />

      <LawsuitsByCourtChart
        data={chartData}
        title={t("lawsuitsByCourt")}
        countLabel={t("lawsuitCount")}
        emptyLabel={t("noChartData")}
        direction={locale === "ar" ? "rtl" : "ltr"}
      />
    </div>
  );
}
