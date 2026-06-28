import { getTranslations, getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { Role } from "@prisma/client";
import { HardDrive } from "lucide-react";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { BackupsAdminPanel } from "@/components/admin/BackupsAdminPanel";
import { getBackupPageData } from "@/app/actions/backup-actions";

export default async function AdminBackupsPage() {
  const t = await getTranslations("admin");
  const locale = await getLocale();
  const session = await auth();

  if (!session?.user) {
    redirect({ href: "/login", locale });
  }

  if (session!.user.role !== Role.SUPER_ADMIN) {
    redirect({ href: "/", locale });
  }

  const pageData = await getBackupPageData();
  if (!pageData) {
    redirect({ href: "/", locale });
  }

  return (
    <div>
      <PageHeader
        title={t("backupsTitle")}
        description={t("backupsDescription")}
        icon={HardDrive}
      />
      <BackupsAdminPanel logs={pageData!.logs} stats={pageData!.stats} />
    </div>
  );
}
