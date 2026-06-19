"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/auditLogger";
import { canManageGafiTasks } from "@/lib/rbac";

const VALID_STATUSES = ["PENDING", "IN_PROGRESS", "COMPLETED"] as const;

export async function updateGafiTaskStatus(taskId: string, newStatus: string) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Unauthorized" };
  }

  if (!canManageGafiTasks(session.user.role)) {
    return { success: false, error: "Forbidden" };
  }

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
