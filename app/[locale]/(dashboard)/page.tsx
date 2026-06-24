import { getTranslations, getLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addDays } from "date-fns";
import { LayoutDashboard } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ExportBoardReportButton } from "@/components/dashboard/ExportBoardReportButton";
import { MaktabiKpiBlocks } from "@/components/dashboard/MaktabiKpiBlocks";
import { UnifiedAgenda } from "@/components/dashboard/UnifiedAgenda";
import { GuaranteeRadarCard } from "@/components/dashboard/GuaranteeRadarCard";
import { isManagerOrAbove } from "@/lib/rbac";
import { countOverdueItems } from "@/lib/dashboard/agenda";
import { ExecutionRequestStatus, LawsuitStatus, PowerOfAttorneyStatus } from "@prisma/client";

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  const locale = await getLocale();
  const session = await auth();
  const now = new Date();
  const thirtyDaysFromNow = addDays(now, 30);

  const [
    activeLawsuits,
    activePoas,
    pendingExecutions,
    completedLegalTasks,
    overdueItems,
    expiringContracts,
    lawsuitsByCourt,
  ] = await Promise.all([
    prisma.lawsuit.count({
      where: { overallStatus: { in: [LawsuitStatus.ACTIVE, LawsuitStatus.UNDER_REVIEW, LawsuitStatus.RESERVED] } },
    }),
    prisma.powerOfAttorney.count({
      where: { status: PowerOfAttorneyStatus.ACTIVE },
    }),
    prisma.executionRequest.count({
      where: { status: ExecutionRequestStatus.PENDING_BAILIFF },
    }),
    prisma.legalTask.count({ where: { status: "COMPLETED" } }),
    countOverdueItems(now),
    prisma.contract.findMany({
      where: {
        status: "ACTIVE",
        guaranteeExpiryDate: { gte: now, lte: thirtyDaysFromNow },
      },
      include: { project: { select: { name: true } } },
      orderBy: { guaranteeExpiryDate: "asc" },
      take: 8,
    }),
    prisma.lawsuit.groupBy({
      by: ["courtName"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),
  ]);

  const chartData = lawsuitsByCourt.map((row) => ({
    courtName: row.courtName,
    count: row._count.id,
  }));

  const guaranteeItems = expiringContracts.map((c) => ({
    id: c.id,
    contractorName: c.contractorName,
    projectName: c.project.name,
    guaranteeExpiryDate: c.guaranteeExpiryDate.toISOString(),
  }));

  const canExport = session?.user ? isManagerOrAbove(session.user.role) : false;
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <div className="space-y-6" dir={dir}>
      <PageHeader
        title={t("executiveTitle")}
        description={t("welcome", { name: session?.user?.name ?? "" })}
        icon={LayoutDashboard}
        action={<ExportBoardReportButton canExport={canExport} />}
      />

      <MaktabiKpiBlocks
        assetsTitle={t("blockAssets")}
        tasksTitle={t("blockTasks")}
        activeLawsuits={activeLawsuits}
        activePoas={activePoas}
        pendingExecutions={pendingExecutions}
        completedTasks={completedLegalTasks}
        overdueItems={overdueItems}
        assetsLabels={{
          lawsuits: t("activeLawsuits"),
          poas: t("activePoas"),
          executions: t("pendingExecutions"),
        }}
        tasksLabels={{
          completed: t("completedTasks"),
          overdue: t("overdueItems"),
        }}
      />

      <div className="grid gap-6 lg:grid-cols-10">
        <div className="lg:col-span-7">
          <UnifiedAgenda />
        </div>
        <div className="lg:col-span-3">
          <GuaranteeRadarCard
            title={t("guaranteeRadar")}
            emptyLabel={t("noExpiringContracts")}
            items={guaranteeItems}
            chartTitle={t("lawsuitsByCourt")}
            chartData={chartData}
            chartCountLabel={t("lawsuitCount")}
            chartEmptyLabel={t("noChartData")}
            direction={dir}
          />
        </div>
      </div>
    </div>
  );
}
