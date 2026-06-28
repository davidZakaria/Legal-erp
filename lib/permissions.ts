import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  Permission,
  PermissionAction,
  PermissionModule,
} from "@/lib/permissions/constants";
import { buildPermission } from "@/lib/permissions/constants";

export function isManagerRole(role: Role): boolean {
  return role === Role.SUPER_ADMIN || role === Role.LEGAL_MANAGER;
}

/** @deprecated Prefer hasPermission(..., MODULE_UPDATE) / MODULE_DELETE. */
export function canUpdateOrDeleteRecords(role: Role): boolean {
  return isManagerRole(role);
}

export function hasPermissionSync(
  role: Role,
  permissions: string[],
  requiredPermission: Permission
): boolean {
  if (isManagerRole(role)) {
    return true;
  }
  return permissions.includes(requiredPermission);
}

export async function hasModulePermission(
  userId: string,
  module: PermissionModule,
  action: PermissionAction,
  role?: Role
): Promise<boolean> {
  return hasPermission(userId, buildPermission(module, action), role);
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

export async function checkPermission(
  userId: string,
  requiredPermission: Permission,
  role?: Role
): Promise<{ allowed: true } | { allowed: false; error: string }> {
  const allowed = await hasPermission(userId, requiredPermission, role);
  if (!allowed) {
    return { allowed: false, error: "Forbidden" };
  }
  return { allowed: true };
}

/** @deprecated Prefer requirePermission from @/lib/auth-guards for server actions. */
export async function requirePermission(
  userId: string,
  requiredPermission: Permission,
  role?: Role
): Promise<void> {
  const result = await checkPermission(userId, requiredPermission, role);
  if (!result.allowed) {
    throw new Error(result.error);
  }
}
