"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/auditLogger";
import { isManagerOrAbove } from "@/lib/rbac";
import { Role, PowerOfAttorneyStatus } from "@prisma/client";
import {
  FK_DELETE_ERROR,
  isForeignKeyConstraintError,
  revalidateModulePaths,
  type ActionResult,
} from "@/lib/server-action-utils";

export async function updatePowerOfAttorney(id: string, formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };
  if (!isManagerOrAbove(session.user.role)) {
    return { success: false, error: "Forbidden" };
  }

  const existing = await prisma.powerOfAttorney.findUnique({ where: { id } });
  if (!existing) return { success: false, error: "Power of attorney not found" };

  const poaNumber = (formData.get("poaNumber") as string)?.trim();
  const clientName = (formData.get("clientName") as string)?.trim();
  const type = (formData.get("type") as string)?.trim();
  const expiryDateStr = formData.get("expiryDate") as string;
  const assignedLawyerId = formData.get("assignedLawyerId") as string;
  const statusRaw = (formData.get("status") as string)?.trim();

  if (!poaNumber || !clientName || !type || !assignedLawyerId) {
    return { success: false, error: "Missing required fields" };
  }

  const expiryDate = expiryDateStr ? new Date(expiryDateStr) : null;
  if (expiryDateStr && expiryDate && isNaN(expiryDate.getTime())) {
    return { success: false, error: "Invalid expiry date" };
  }

  const lawyer = await prisma.user.findFirst({
    where: { id: assignedLawyerId, role: Role.LAWYER },
  });
  if (!lawyer) return { success: false, error: "Invalid assigned lawyer" };

  const status =
    statusRaw === PowerOfAttorneyStatus.REVOKED
      ? PowerOfAttorneyStatus.REVOKED
      : PowerOfAttorneyStatus.ACTIVE;

  await prisma.powerOfAttorney.update({
    where: { id },
    data: { poaNumber, clientName, type, expiryDate, assignedLawyerId, status },
  });

  await logActivity(session.user.id, "UPDATE", "PowerOfAttorney", id);
  revalidateModulePaths("/");
  return { success: true, id };
}

export async function deletePowerOfAttorney(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };
  if (!isManagerOrAbove(session.user.role)) {
    return { success: false, error: "Forbidden" };
  }

  try {
    await prisma.powerOfAttorney.delete({ where: { id } });
    await logActivity(session.user.id, "DELETE", "PowerOfAttorney", id);
    revalidateModulePaths("/");
    return { success: true };
  } catch (error) {
    if (isForeignKeyConstraintError(error)) {
      return { success: false, error: FK_DELETE_ERROR };
    }
    return { success: false, error: "Delete failed" };
  }
}

export async function updateLegalTask(id: string, formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };
  if (!isManagerOrAbove(session.user.role)) {
    return { success: false, error: "Forbidden" };
  }

  const existing = await prisma.legalTask.findUnique({ where: { id } });
  if (!existing) return { success: false, error: "Task not found" };

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
  if (!lawyer) return { success: false, error: "Invalid assigned lawyer" };

  await prisma.legalTask.update({
    where: { id },
    data: { title, description, deadline, assignedLawyerId },
  });

  await logActivity(session.user.id, "UPDATE", "LegalTask", id);
  revalidateModulePaths("/");
  return { success: true, id };
}

export async function deleteLegalTask(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };
  if (!isManagerOrAbove(session.user.role)) {
    return { success: false, error: "Forbidden" };
  }

  try {
    await prisma.legalTask.delete({ where: { id } });
    await logActivity(session.user.id, "DELETE", "LegalTask", id);
    revalidateModulePaths("/");
    return { success: true };
  } catch (error) {
    if (isForeignKeyConstraintError(error)) {
      return { success: false, error: FK_DELETE_ERROR };
    }
    return { success: false, error: "Delete failed" };
  }
}
