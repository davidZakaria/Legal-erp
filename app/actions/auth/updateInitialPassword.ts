"use server";

import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/auditLogger";

const DEFAULT_RESET_PASSWORD = process.env.DEFAULT_RESET_PASSWORD ?? "Njd@2026";

export async function updateInitialPassword(
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  if (!session.user.requiresPasswordChange) {
    return { success: false, error: "Password already configured" };
  }

  const trimmed = newPassword.trim();
  if (trimmed.length < 8) {
    return { success: false, error: "Password must be at least 8 characters" };
  }

  if (trimmed === DEFAULT_RESET_PASSWORD) {
    return { success: false, error: "Choose a different password than the default reset password" };
  }

  const passwordHash = await bcrypt.hash(trimmed, 10);

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      passwordHash,
      requiresPasswordChange: false,
    },
  });

  await logActivity(session.user.id, "CHANGE_INITIAL_PASSWORD", "User", session.user.id);

  return { success: true };
}
