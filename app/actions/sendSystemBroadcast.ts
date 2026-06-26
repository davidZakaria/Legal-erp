"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireAuthenticatedSession } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/auditLogger";
import { isManagerOrAbove } from "@/lib/rbac";
import { sendBroadcastEmail } from "@/lib/email";

export async function sendSystemBroadcast(formData: FormData) {
  const gate = await requireAuthenticatedSession();
  if (!gate.success) {
    return { success: false, error: gate.error };
  }
  const session = gate.session;

  if (!isManagerOrAbove(session.user.role)) {
    return { success: false, error: "Forbidden" };
  }

  const subject = (formData.get("subject") as string)?.trim();
  const message = (formData.get("message") as string)?.trim();

  if (!subject || !message) {
    return { success: false, error: "Subject and message are required" };
  }

  const users = await prisma.user.findMany({
    select: { email: true },
  });

  const emails = users.map((user) => user.email).filter(Boolean);
  if (!emails.length) {
    return { success: false, error: "No user emails found" };
  }

  const result = await sendBroadcastEmail(emails, subject, message);
  if (!result.success) {
    return { success: false, error: result.message };
  }

  await logActivity(session.user.id, "BROADCAST", "System", subject);
  revalidatePath("/ar");
  revalidatePath("/en");

  return { success: true, recipientCount: emails.length };
}
