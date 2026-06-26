import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { Permission } from "@/lib/permissions/constants";

export function isManagerRole(role: Role): boolean {
  return role === Role.SUPER_ADMIN || role === Role.LEGAL_MANAGER;
}

/** Full record edit/delete (CRUD) — managers and super admins only. */
export function canUpdateOrDeleteRecords(role: Role): boolean {
  return isManagerRole(role);
}

/** Admin section: user management & system settings — managers only. */
export function canAccessAdminSection(role: Role): boolean {
  return isManagerRole(role);
}

/**
 * Golden rule: SUPER_ADMIN and LEGAL_MANAGER always pass.
 * Otherwise the permission must exist on the user record.
 */
export async function hasPermission(
  userId: string,
  requiredPermission: Permission,
  role?: Role
): Promise<boolean> {
  if (role && isManagerRole(role)) {
    return true;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, permissions: true, isActive: true },
  });

  if (!user || !user.isActive) {
    return false;
  }

  if (isManagerRole(user.role)) {
    return true;
  }

  return user.permissions.includes(requiredPermission);
}

export async function requirePermission(
  userId: string,
  requiredPermission: Permission,
  role?: Role
): Promise<void> {
  const allowed = await hasPermission(userId, requiredPermission, role);
  if (!allowed) {
    throw new Error("Unauthorized");
  }
}
