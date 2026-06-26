"use client";

import { useSession } from "next-auth/react";
import { Role } from "@prisma/client";
import type { Permission } from "@/lib/permissions/constants";

type PermissionGuardProps = {
  permission: Permission;
  children: React.ReactNode;
};

export function PermissionGuard({ permission, children }: PermissionGuardProps) {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return null;
  }

  if (!session?.user) {
    return null;
  }

  const role = session.user.role;
  if (role === Role.SUPER_ADMIN || role === Role.LEGAL_MANAGER) {
    return <>{children}</>;
  }

  const permissions = session.user.permissions ?? [];
  if (!permissions.includes(permission)) {
    return null;
  }

  return <>{children}</>;
}
