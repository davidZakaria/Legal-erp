"use server";

import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/auditLogger";
import { requireAuthenticatedOnly } from "@/lib/auth-guards";

const DEFAULT_RESET_PASSWORD = process.env.DEFAULT_RESET_PASSWORD ?? "Njd@2026";

export async function updateInitialPassword(
  newPassword: string
): Promise<{ success: boolean; error?: string; alreadyConfigured?: boolean }> {
  const gate = await requireAuthenticatedOnly();
  if (!gate.success) {
    return { success: false, error: gate.error };
  }

  const session = gate.session;

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { requiresPasswordChange: true },
  });

  if (!dbUser) {
    return { success: false, error: "Unauthorized" };
  }

  if (!dbUser.requiresPasswordChange) {
    if (session.user.requiresPasswordChange) {
      return { success: true, alreadyConfigured: true };
    }
    return { success: false, error: "Password already configured" };
  }

  const trimmed = newPassword.trim();
  if (trimmed.length < 8) {
    return { success: false, error: "Password must be at least 8 characters" };
  }

  if (trimmed === DEFAULT_RESET_PASSWORD) {
    return {
      success: false,
      error: "Choose a different password than the default reset password",
    };
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
