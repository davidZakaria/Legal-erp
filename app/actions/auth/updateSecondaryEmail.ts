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
    return { success: false, error: "يجب تسجيل الدخول أولاً" };
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
    select: { email: true, secondaryEmail: true },
  });

  if (!user) {
    return { success: false, error: "تعذر العثور على الحساب" };
  }

  if (normalizeEmail(user.email) === normalized) {
    return {
      success: false,
      error: "البريد الاحتياطي يجب أن يختلف عن البريد الرئيسي للحساب",
    };
  }

  if (user.secondaryEmail && normalizeEmail(user.secondaryEmail) === normalized) {
    return { success: true };
  }

  const takenByOther = await prisma.user.findFirst({
    where: {
      id: { not: session.user.id },
      OR: [{ email: normalized }, { secondaryEmail: normalized }],
    },
    select: { id: true },
  });

  if (takenByOther) {
    return {
      success: false,
      error: "هذا البريد مستخدم بالفعل في حساب آخر",
    };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { secondaryEmail: normalized },
  });

  await logActivity(session.user.id, "UPDATE", "User", session.user.id);

  return { success: true };
}
