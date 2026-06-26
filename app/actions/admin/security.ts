"use server";

import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { auth } from "@/lib/auth";
import { requireAuthenticatedSession } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/auditLogger";

async function assertSuperAdmin() {
  const gate = await requireAuthenticatedSession();
  if (!gate.success || gate.session.user.role !== Role.SUPER_ADMIN) {
    return null;
  }
  return gate.session;
}

export async function updateSecuritySettings(formData: FormData) {
  const session = await assertSuperAdmin();
  if (!session) {
    return { success: false, error: "Forbidden" };
  }

  const isTwoFactorEnabled = formData.get("isTwoFactorEnabled") === "true";
  const secondaryEmail = (formData.get("secondaryEmail") as string)?.trim() || null;

  await prisma.user.update({
    where: { id: session.user.id },
    data: { isTwoFactorEnabled, secondaryEmail },
  });

  await logActivity(session.user.id, "UPDATE_SECURITY_SETTINGS", "User", session.user.id);

  revalidatePath("/ar/admin/security");
  revalidatePath("/en/admin/security");

  return { success: true };
}

export async function getSecurityPageData() {
  const session = await assertSuperAdmin();
  if (!session) {
    return null;
  }

  const [user, backupLogs] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        isTwoFactorEnabled: true,
        secondaryEmail: true,
        email: true,
      },
    }),
    prisma.backupLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  if (!user) return null;

  return { user, backupLogs };
}
