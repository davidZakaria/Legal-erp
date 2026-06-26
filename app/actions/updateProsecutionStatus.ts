"use server";

import { revalidatePath } from "next/cache";
import { ProsecutionStatus } from "@prisma/client";
import { requirePermission } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/auditLogger";
import { PROSECUTION_STATUSES } from "@/lib/prosecutions/constants";

export async function updateProsecutionStatus(prosecutionId: string, newStatus: string) {
  const gate = await requirePermission("PROSECUTIONS_UPDATE");
  if (!gate.success) {
    return { success: false, error: gate.error };
  }
  const session = gate.session;

  if (!PROSECUTION_STATUSES.includes(newStatus as (typeof PROSECUTION_STATUSES)[number])) {
    return { success: false, error: "Invalid status" };
  }

  const existing = await prisma.prosecution.findUnique({ where: { id: prosecutionId } });
  if (!existing) {
    return { success: false, error: "Prosecution not found" };
  }

  await prisma.prosecution.update({
    where: { id: prosecutionId },
    data: { status: newStatus as ProsecutionStatus },
  });

  await logActivity(session.user.id, "UPDATE_STATUS", "Prosecution", prosecutionId);

  revalidatePath("/ar/prosecutions");
  revalidatePath("/en/prosecutions");

  return { success: true };
}
