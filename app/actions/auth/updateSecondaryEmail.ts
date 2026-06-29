"use server";

import { requireAuthenticatedOnly } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/auditLogger";

const GMAIL_DOMAIN = "@gmail.com";

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export async function updateSecondaryEmail(
  secondaryEmail: string
): Promise<{ success: boolean; error?: string }> {
  const gate = await requireAuthenticatedOnly();
  if (!gate.success) {
    return { success: false, error: gate.error };
  }

  const session = gate.session;
  const normalized = normalizeEmail(secondaryEmail);

  if (!normalized) {
    return { success: false, error: "البريد الإلكتروني مطلوب" };
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(normalized)) {
    return { success: false, error: "صيغة البريد الإلكتروني غير صحيحة" };
  }

  if (!normalized.endsWith(GMAIL_DOMAIN)) {
    return {
      success: false,
      error: "يجب استخدام بريد Gmail للتحقق الثنائي (مثال: name@gmail.com)",
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, requiresPasswordChange: true },
  });

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  if (user.requiresPasswordChange) {
    return { success: false, error: "يجب إعداد كلمة المرور أولاً" };
  }

  if (normalizeEmail(user.email) === normalized) {
    return {
      success: false,
      error: "البريد الاحتياطي يجب أن يختلف عن البريد الرئيسي للحساب",
    };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { secondaryEmail: normalized },
  });

  await logActivity(session.user.id, "UPDATE", "User", session.user.id);

  return { success: true };
}
