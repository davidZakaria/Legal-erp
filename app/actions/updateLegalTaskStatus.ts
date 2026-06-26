"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireAuthenticatedSession } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/auditLogger";
import { LegalTaskStatus, Role } from "@prisma/client";

export async function updateLegalTaskStatus(taskId: string, newStatus: LegalTaskStatus) {
  const gate = await requireAuthenticatedSession();
  if (!gate.success) {
    return { success: false, error: gate.error };
  }
  const session = gate.session;

  const task = await prisma.legalTask.findUnique({
    where: { id: taskId },
    include: { assignedLawyer: true },
  });

  if (!task) {
    return { success: false, error: "Task not found" };
  }

  const isAssignedLawyer = session.user.id === task.assignedLawyerId;
  const isManager = session.user.role === Role.SUPER_ADMIN || session.user.role === Role.LEGAL_MANAGER;

  if (!isAssignedLawyer && !isManager) {
    return { success: false, error: "Forbidden" };
  }

  if (!Object.values(LegalTaskStatus).includes(newStatus)) {
    return { success: false, error: "Invalid status" };
  }

  await prisma.legalTask.update({
    where: { id: taskId },
    data: { status: newStatus },
  });

  await logActivity(session.user.id, "UPDATE_STATUS", "LegalTask", taskId);

  if (newStatus === LegalTaskStatus.COMPLETED) {
    const { notifyManagersNonBlocking } = await import("@/lib/email");
    notifyManagersNonBlocking(
      session.user.name ?? task.assignedLawyer.name,
      `إنجاز مهمة قانونية: "${task.title}"`
    );
  }

  revalidatePath("/ar");
  revalidatePath("/en");

  return { success: true };
}
