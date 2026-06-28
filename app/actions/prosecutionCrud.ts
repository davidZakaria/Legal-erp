"use server";

import { requirePermission } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/auditLogger";
import { PROSECUTION_ISSUE_TYPES } from "@/lib/prosecutions/constants";
import {
  FK_DELETE_ERROR,
  isForeignKeyConstraintError,
  revalidateModulePaths,
  type ActionResult,
} from "@/lib/server-action-utils";
import {
  notifyIfLawyerAssigned,
  notifyProsecutionAssignmentNonBlocking,
} from "@/lib/notifications/assignment-matrix";

export async function updateProsecution(id: string, formData: FormData): Promise<ActionResult> {
  const gate = await requirePermission("PROSECUTIONS_UPDATE");
  if (!gate.success) return { success: false, error: gate.error };
  const session = gate.session;

  const existing = await prisma.prosecution.findUnique({ where: { id } });
  if (!existing) return { success: false, error: "Prosecution not found" };

  const caseNumber = (formData.get("caseNumber") as string)?.trim();
  const reportNumber = (formData.get("reportNumber") as string)?.trim() || null;
  const yearStr = formData.get("year") as string;
  const policeStation = (formData.get("policeStation") as string)?.trim();
  const clientName = (formData.get("clientName") as string)?.trim();
  const issueType = formData.get("issueType") as string;
  const assignedLawyerId = formData.get("assignedLawyerId") as string;

  if (!caseNumber || !yearStr || !policeStation || !clientName || !issueType || !assignedLawyerId) {
    return { success: false, error: "Missing required fields" };
  }

  const year = Number(yearStr);
  if (!Number.isInteger(year) || year < 1900 || year > 2100) {
    return { success: false, error: "Invalid year" };
  }

  if (!PROSECUTION_ISSUE_TYPES.includes(issueType as (typeof PROSECUTION_ISSUE_TYPES)[number])) {
    return { success: false, error: "Invalid issue type" };
  }

  const lawyer = await prisma.user.findUnique({ where: { id: assignedLawyerId } });
  if (!lawyer) return { success: false, error: "Lawyer not found" };

  await prisma.prosecution.update({
    where: { id },
    data: { caseNumber, reportNumber, year, policeStation, clientName, issueType, assignedLawyerId },
  });

  notifyIfLawyerAssigned(existing.assignedLawyerId, assignedLawyerId, lawyer, (assigned) =>
    notifyProsecutionAssignmentNonBlocking(
      assigned,
      policeStation,
      caseNumber,
      year,
      issueType,
      clientName
    )
  );

  await logActivity(session.user.id, "UPDATE", "Prosecution", id);
  revalidateModulePaths("/prosecutions");
  return { success: true, id };
}

export async function deleteProsecution(id: string): Promise<ActionResult> {
  const gate = await requirePermission("PROSECUTIONS_DELETE");
  if (!gate.success) return { success: false, error: gate.error };
  const session = gate.session;

  try {
    await prisma.prosecution.delete({ where: { id } });
    await logActivity(session.user.id, "DELETE", "Prosecution", id);
    revalidateModulePaths("/prosecutions");
    return { success: true };
  } catch (error) {
    if (isForeignKeyConstraintError(error)) {
      return { success: false, error: FK_DELETE_ERROR };
    }
    return { success: false, error: "Delete failed" };
  }
}
