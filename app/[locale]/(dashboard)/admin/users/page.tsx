import { getTranslations, getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessAdminSection } from "@/lib/rbac";
import { Role } from "@prisma/client";
import { Users } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { UsersAdminPanel } from "@/components/admin/UsersAdminPanel";

export default async function AdminUsersPage() {
  const t = await getTranslations("admin");
  const locale = await getLocale();
  const session = await auth();

  if (!session?.user) {
    redirect({ href: "/login", locale });
  }

  if (!canAccessAdminSection(session!.user.role)) {
    redirect({ href: "/", locale });
  }

  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      permissions: true,
      isActive: true,
    },
  });

  return (
    <div>
      <PageHeader
        title={t("usersTitle")}
        description={t("usersDescription")}
        icon={Users}
      />
      <UsersAdminPanel
        users={users}
        currentUserId={session!.user.id}
        canCreateSuperAdmin={session!.user.role === Role.SUPER_ADMIN}
      />
    </div>
  );
}
