"use server";

import { revalidatePath } from "next/cache";
import { ProsecutionStatus } from "@prisma/client";
import { requirePermission } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/auditLogger";

export async function archiveProsecutionReport(prosecutionId: string) {
  const gate = await requirePermission("PROSECUTIONS_UPDATE");
  if (!gate.success) {
    return { success: false, error: gate.error };
  }
  const session = gate.session;

  const existing = await prisma.prosecution.findUnique({ where: { id: prosecutionId } });
  if (!existing) {
    return { success: false, error: "Prosecution not found" };
  }

  if (existing.status === ProsecutionStatus.ARCHIVED_SAVED) {
    return { success: false, error: "Already archived" };
  }

  await prisma.prosecution.update({
    where: { id: prosecutionId },
    data: { status: ProsecutionStatus.ARCHIVED_SAVED },
  });

  await logActivity(session.user.id, "ARCHIVE_REPORT", "Prosecution", prosecutionId);

  revalidatePath("/ar/prosecutions");
  revalidatePath("/en/prosecutions");

  return { success: true };
}
