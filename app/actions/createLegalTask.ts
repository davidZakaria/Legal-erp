"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireAuthenticatedSession } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/auditLogger";
import { isManagerOrAbove } from "@/lib/rbac";
import { Role } from "@prisma/client";
import { notifyLegalTaskAssignmentNonBlocking } from "@/lib/notifications/assignment-matrix";

export async function createLegalTask(formData: FormData) {
  const gate = await requireAuthenticatedSession();
  if (!gate.success) {
    return { success: false, error: gate.error };
  }
  const session = gate.session;

  if (!isManagerOrAbove(session.user.role)) {
    return { success: false, error: "Forbidden" };
  }

  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const deadlineStr = formData.get("deadline") as string;
  const assignedLawyerId = formData.get("assignedLawyerId") as string;

  if (!title || !deadlineStr || !assignedLawyerId) {
    return { success: false, error: "Missing required fields" };
  }

  const deadline = new Date(deadlineStr);
  if (isNaN(deadline.getTime())) {
    return { success: false, error: "Invalid deadline" };
  }

  const lawyer = await prisma.user.findFirst({
    where: { id: assignedLawyerId, role: Role.LAWYER },
  });
  if (!lawyer) {
    return { success: false, error: "Invalid assigned lawyer" };
  }

  const task = await prisma.legalTask.create({
    data: { title, description, deadline, assignedLawyerId },
  });

  await logActivity(session.user.id, "CREATE", "LegalTask", task.id);

  notifyLegalTaskAssignmentNonBlocking(lawyer, title, deadline);

  revalidatePath("/ar");
  revalidatePath("/en");

  return { success: true, taskId: task.id };
}
