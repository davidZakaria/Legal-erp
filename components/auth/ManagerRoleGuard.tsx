"use client";

import { useSession } from "next-auth/react";
import { Role } from "@prisma/client";

type ManagerRoleGuardProps = {
  children: React.ReactNode;
};

export function ManagerRoleGuard({ children }: ManagerRoleGuardProps) {
  const { data: session, status } = useSession();

  if (status === "loading" || !session?.user) {
    return null;
  }

  const role = session.user.role;
  if (role !== Role.SUPER_ADMIN && role !== Role.LEGAL_MANAGER) {
    return null;
  }

  return <>{children}</>;
}
