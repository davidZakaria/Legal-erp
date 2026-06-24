import { getTranslations, getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { LawyerPerformanceGrid } from "@/components/performance/LawyerPerformanceGrid";
import { canViewPerformanceDashboard } from "@/lib/rbac";
import { calculateLawyerKpis } from "@/lib/performance/calculateLawyerKpis";

export default async function PerformancePage() {
  const t = await getTranslations("performance");
  const locale = await getLocale();
  const session = await auth();

  if (!session?.user) {
    redirect({ href: "/login", locale });
  }

  const user = session!.user;

  if (!canViewPerformanceDashboard(user.role)) {
    redirect({ href: "/", locale });
  }

  const kpis = await calculateLawyerKpis();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        icon={BarChart3}
      />
      <LawyerPerformanceGrid kpis={kpis} />
    </div>
  );
}
