"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/auditLogger";
import { canManageProsecutions } from "@/lib/rbac";
import { PROSECUTION_STATUSES } from "@/lib/prosecutions/constants";

export async function updateProsecutionStatus(prosecutionId: string, newStatus: string) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Unauthorized" };
  }

  if (!canManageProsecutions(session.user.role)) {
    return { success: false, error: "Forbidden" };
  }

  if (!PROSECUTION_STATUSES.includes(newStatus as (typeof PROSECUTION_STATUSES)[number])) {
    return { success: false, error: "Invalid status" };
  }

  const existing = await prisma.prosecution.findUnique({ where: { id: prosecutionId } });
  if (!existing) {
    return { success: false, error: "Prosecution not found" };
  }

  await prisma.prosecution.update({
    where: { id: prosecutionId },
    data: { status: newStatus },
  });

  await logActivity(session.user.id, "UPDATE_STATUS", "Prosecution", prosecutionId);

  revalidatePath("/ar/prosecutions");
  revalidatePath("/en/prosecutions");

  return { success: true };
}
