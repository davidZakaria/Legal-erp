"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/auditLogger";

const VALID_STATUSES = ["PENDING", "IN_PROGRESS", "COMPLETED"] as const;

export async function updateGafiTaskStatus(taskId: string, newStatus: string) {
  const gate = await requirePermission("GAFI_UPDATE");
  if (!gate.success) {
    return { success: false, error: gate.error };
  }
  const session = gate.session;

  if (!VALID_STATUSES.includes(newStatus as (typeof VALID_STATUSES)[number])) {
    return { success: false, error: "Invalid status" };
  }

  const existing = await prisma.gAFITask.findUnique({ where: { id: taskId } });
  if (!existing) {
    return { success: false, error: "Task not found" };
  }

  await prisma.gAFITask.update({
    where: { id: taskId },
    data: { status: newStatus },
  });

  await logActivity(session.user.id, "UPDATE_STATUS", "GAFITask", taskId);

  revalidatePath("/ar/gafi");
  revalidatePath("/en/gafi");

  return { success: true };
}
