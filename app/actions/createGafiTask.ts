"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireAuthenticatedSession } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/auditLogger";
import { hasPermission } from "@/lib/permissions";

const VALID_TASK_TYPES = ["ASSEMBLY", "TRADEMARK"] as const;

export async function createGafiTask(formData: FormData) {
  const gate = await requireAuthenticatedSession();
  if (!gate.success) {
    return { success: false, error: gate.error };
  }
  const session = gate.session;

  if (!(await hasPermission(session.user.id, "GAFI_CREATE", session.user.role))) {
    return { success: false, error: "Forbidden" };
  }

  const title = (formData.get("title") as string)?.trim();
  const taskType = formData.get("taskType") as string;
  const deadlineStr = formData.get("deadline") as string;

  if (!title || !taskType || !deadlineStr) {
    return { success: false, error: "Missing required fields" };
  }

  if (!VALID_TASK_TYPES.includes(taskType as (typeof VALID_TASK_TYPES)[number])) {
    return { success: false, error: "Invalid task type" };
  }

  const deadline = new Date(deadlineStr);
  if (isNaN(deadline.getTime())) {
    return { success: false, error: "Invalid deadline" };
  }

  const task = await prisma.gAFITask.create({
    data: {
      title,
      taskType,
      deadline,
      status: "PENDING",
    },
  });

  await logActivity(session.user.id, "CREATE", "GAFITask", task.id);

  revalidatePath("/ar/gafi");
  revalidatePath("/en/gafi");

  return { success: true, taskId: task.id };
}
