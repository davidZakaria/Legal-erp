"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/auditLogger";
import { isManagerOrAbove } from "@/lib/rbac";
import { PROSECUTION_ISSUE_TYPES } from "@/lib/prosecutions/constants";
import {
  FK_DELETE_ERROR,
  isForeignKeyConstraintError,
  revalidateModulePaths,
  type ActionResult,
} from "@/lib/server-action-utils";

export async function updateProsecution(id: string, formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };
  if (!isManagerOrAbove(session.user.role)) {
    return { success: false, error: "Forbidden" };
  }

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

  await logActivity(session.user.id, "UPDATE", "Prosecution", id);
  revalidateModulePaths("/prosecutions");
  return { success: true, id };
}

export async function deleteProsecution(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };
  if (!isManagerOrAbove(session.user.role)) {
    return { success: false, error: "Forbidden" };
  }

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
