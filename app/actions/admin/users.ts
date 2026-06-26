"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/auditLogger";
import { canAccessAdminSection } from "@/lib/rbac";
import {
  DEFAULT_LAWYER_PERMISSIONS,
  sanitizePermissions,
} from "@/lib/permissions/constants";

async function assertAdmin() {
  const session = await auth();
  if (!session?.user || !canAccessAdminSection(session.user.role)) {
    throw new Error("Forbidden");
  }
  return session;
}

export async function createUser(formData: FormData) {
  const session = await assertAdmin();

  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;
  const phone = (formData.get("phone") as string)?.trim() || null;
  const roleRaw = formData.get("role") as string;
  const permissionsRaw = formData.get("permissions") as string;

  if (!name || !email || !password) {
    return { success: false, error: "Missing required fields" };
  }

  if (password.length < 8) {
    return { success: false, error: "Password must be at least 8 characters" };
  }

  const role =
    roleRaw === Role.SUPER_ADMIN ||
    roleRaw === Role.LEGAL_MANAGER ||
    roleRaw === Role.LAWYER
      ? roleRaw
      : Role.LAWYER;

  if (role === Role.SUPER_ADMIN && session.user.role !== Role.SUPER_ADMIN) {
    return { success: false, error: "Only super admins can create super admins" };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { success: false, error: "Email already in use" };
  }

  let permissions = permissionsRaw
    ? sanitizePermissions(JSON.parse(permissionsRaw) as string[])
    : role === Role.LAWYER
      ? [...DEFAULT_LAWYER_PERMISSIONS]
      : [];

  if (role !== Role.LAWYER) {
    permissions = [];
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      phone,
      role,
      permissions,
      isActive: true,
      requiresPasswordChange: true,
    },
  });

  await logActivity(session.user.id, "CREATE_USER", "User", user.id);
  revalidatePath("/ar/admin/users");
  revalidatePath("/en/admin/users");

  return { success: true, userId: user.id };
}

export async function updateUser(formData: FormData) {
  const session = await assertAdmin();

  const userId = formData.get("userId") as string;
  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const phone = (formData.get("phone") as string)?.trim() || null;
  const roleRaw = formData.get("role") as string;
  const permissionsRaw = formData.get("permissions") as string;
  const password = (formData.get("password") as string)?.trim();

  if (!userId || !name || !email) {
    return { success: false, error: "Missing required fields" };
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) {
    return { success: false, error: "User not found" };
  }

  const role =
    roleRaw === Role.SUPER_ADMIN ||
    roleRaw === Role.LEGAL_MANAGER ||
    roleRaw === Role.LAWYER
      ? roleRaw
      : target.role;

  if (role === Role.SUPER_ADMIN && session.user.role !== Role.SUPER_ADMIN) {
    return { success: false, error: "Only super admins can assign super admin role" };
  }

  if (target.role === Role.SUPER_ADMIN && session.user.role !== Role.SUPER_ADMIN) {
    return { success: false, error: "Cannot edit super admin accounts" };
  }

  const emailConflict = await prisma.user.findFirst({
    where: { email, NOT: { id: userId } },
  });
  if (emailConflict) {
    return { success: false, error: "Email already in use" };
  }

  let permissions = permissionsRaw
    ? sanitizePermissions(JSON.parse(permissionsRaw) as string[])
    : target.permissions;

  if (role !== Role.LAWYER) {
    permissions = [];
  }

  const data: {
    name: string;
    email: string;
    phone: string | null;
    role: Role;
    permissions: string[];
    passwordHash?: string;
  } = { name, email, phone, role, permissions };

  if (password) {
    if (password.length < 8) {
      return { success: false, error: "Password must be at least 8 characters" };
    }
    data.passwordHash = await bcrypt.hash(password, 10);
  }

  await prisma.user.update({ where: { id: userId }, data });
  await logActivity(session.user.id, "UPDATE_USER", "User", userId);

  revalidatePath("/ar/admin/users");
  revalidatePath("/en/admin/users");

  return { success: true };
}

export async function toggleUserActive(userId: string) {
  const session = await assertAdmin();

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) {
    return { success: false, error: "User not found" };
  }

  if (target.id === session.user.id) {
    return { success: false, error: "Cannot deactivate your own account" };
  }

  if (target.role === Role.SUPER_ADMIN && session.user.role !== Role.SUPER_ADMIN) {
    return { success: false, error: "Cannot modify super admin accounts" };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { isActive: !target.isActive },
  });

  await logActivity(
    session.user.id,
    target.isActive ? "DEACTIVATE_USER" : "ACTIVATE_USER",
    "User",
    userId
  );

  revalidatePath("/ar/admin/users");
  revalidatePath("/en/admin/users");

  return { success: true, isActive: !target.isActive };
}

export async function resetUserPassword(userId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.SUPER_ADMIN) {
    return { success: false, error: "Forbidden" };
  }

  if (userId === session.user.id) {
    return { success: false, error: "Cannot reset your own password with this action" };
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) {
    return { success: false, error: "User not found" };
  }

  const defaultPassword = process.env.DEFAULT_RESET_PASSWORD ?? "Njd@2026";
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash,
      requiresPasswordChange: true,
      otpCode: null,
      otpExpiry: null,
    },
  });

  await logActivity(session.user.id, "RESET_PASSWORD", "User", userId);

  revalidatePath("/ar/admin/users");
  revalidatePath("/en/admin/users");

  return { success: true };
}
