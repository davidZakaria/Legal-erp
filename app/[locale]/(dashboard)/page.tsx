import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addDays } from "date-fns";
import { AlertTriangle, CalendarClock, LayoutDashboard, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  const session = await auth();
  const thirtyDaysFromNow = addDays(new Date(), 30);
  const tomorrow = addDays(new Date(), 1);
  const tomorrowEnd = new Date(tomorrow);
  tomorrowEnd.setHours(23, 59, 59, 999);

  const [expiringContracts, sessionsTomorrow, prosecutions] = await Promise.all([
    prisma.contract.count({
      where: { guaranteeExpiryDate: { lte: thirtyDaysFromNow } },
    }),
    prisma.courtSession.count({
      where: {
        sessionDate: { gte: tomorrow, lte: tomorrowEnd },
        status: "PENDING",
      },
    }),
    prisma.prosecution.count(),
  ]);

  const stats = [
    {
      title: t("contractsExpiring"),
      value: expiringContracts,
      icon: AlertTriangle,
      accent: "text-destructive",
      bg: "bg-destructive/10",
    },
    {
      title: t("sessionsTomorrow"),
      value: sessionsTomorrow,
      icon: CalendarClock,
      accent: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: t("openProsecutions"),
      value: prosecutions,
      icon: ShieldAlert,
      accent: "text-slate-900",
      bg: "bg-slate-100",
    },
  ];

  return (
    <div>
      <PageHeader
        title={t("welcome", { name: session?.user?.name ?? "" })}
        description={t("title")}
        icon={LayoutDashboard}
      />
      <div className="grid gap-5 md:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="border-slate-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  {stat.title}
                </CardTitle>
                <div className={`rounded-lg p-2 ${stat.bg}`}>
                  <Icon className={`h-4 w-4 ${stat.accent}`} />
                </div>
              </CardHeader>
              <CardContent>
                <p className={`text-3xl font-bold ${stat.accent}`}>{stat.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
