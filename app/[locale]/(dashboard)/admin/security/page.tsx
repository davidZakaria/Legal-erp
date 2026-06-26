import { getTranslations, getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { Role } from "@prisma/client";
import { ShieldCheck } from "lucide-react";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { SecurityAdminPanel } from "@/components/admin/SecurityAdminPanel";
import { getSecurityPageData } from "@/app/actions/admin/security";

export default async function AdminSecurityPage() {
  const t = await getTranslations("admin");
  const locale = await getLocale();
  const session = await auth();

  if (!session?.user) {
    redirect({ href: "/login", locale });
  }

  if (session!.user.role !== Role.SUPER_ADMIN) {
    redirect({ href: "/", locale });
  }

  const pageData = await getSecurityPageData();
  if (!pageData) redirect({ href: "/", locale });

  const { user, backupLogs } = pageData!;
  return (
    <div>
      <PageHeader
        title={t("securityTitle")}
        description={t("securityDescription")}
        icon={ShieldCheck}
      />
      <SecurityAdminPanel
        isTwoFactorEnabled={user.isTwoFactorEnabled}
        secondaryEmail={user.secondaryEmail}
        primaryEmail={user.email}
        backupLogs={backupLogs.map((log) => ({
          id: log.id,
          fileName: log.fileName,
          type: log.type,
          createdAt: log.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}

