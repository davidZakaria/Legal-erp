"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/auditLogger";
import { isManagerOrAbove } from "@/lib/rbac";
import { Role } from "@prisma/client";

export async function createExecutionRequest(formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Unauthorized" };
  }

  if (!isManagerOrAbove(session.user.role)) {
    return { success: false, error: "Forbidden" };
  }

  const lawsuitId = formData.get("lawsuitId") as string;
  const executionType = (formData.get("executionType") as string)?.trim();
  const assignedLawyerId = formData.get("assignedLawyerId") as string;

  if (!lawsuitId || !executionType || !assignedLawyerId) {
    return { success: false, error: "Missing required fields" };
  }

  const lawsuit = await prisma.lawsuit.findUnique({ where: { id: lawsuitId } });
  if (!lawsuit) {
    return { success: false, error: "Lawsuit not found" };
  }

  const lawyer = await prisma.user.findFirst({
    where: { id: assignedLawyerId, role: Role.LAWYER },
  });
  if (!lawyer) {
    return { success: false, error: "Invalid assigned lawyer" };
  }

  const request = await prisma.executionRequest.create({
    data: { lawsuitId, executionType, assignedLawyerId },
  });

  await logActivity(session.user.id, "CREATE", "ExecutionRequest", request.id);
  revalidatePath("/ar");
  revalidatePath("/en");

  return { success: true, requestId: request.id };
}
