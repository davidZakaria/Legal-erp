import { getTranslations, getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { canAccessAdminSection } from "@/lib/rbac";
import { getAllLookups } from "@/lib/lookups";
import { Settings } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { SettingsClient } from "@/components/settings/SettingsClient";
import { ClearOperationalDataCard } from "@/components/admin/ClearOperationalDataCard";
import { getOperationalDataCounts } from "@/lib/clear-operational-data";
import { Role } from "@prisma/client";

export default async function AdminSettingsPage() {
  const t = await getTranslations("admin");
  const locale = await getLocale();
  const session = await auth();

  if (!session?.user) {
    redirect({ href: "/login", locale });
  }

  if (!canAccessAdminSection(session!.user.role)) {
    redirect({ href: "/", locale });
  }

  const { courts, policeStations, expertOffices, projects } = await getAllLookups();
  const operationalCounts =
    session!.user.role === Role.SUPER_ADMIN
      ? await getOperationalDataCounts()
      : null;

  return (
    <div dir="rtl" className="text-right">
      <PageHeader
        title={t("settingsTitle")}
        description={t("settingsDescription")}
        icon={Settings}
      />

      <SettingsClient
        courts={courts}
        policeStations={policeStations}
        expertOffices={expertOffices}
        projects={projects}
      />

      {operationalCounts && (
        <ClearOperationalDataCard counts={operationalCounts} />
      )}
    </div>
  );
}
