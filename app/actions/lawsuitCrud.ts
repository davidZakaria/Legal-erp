"use server";

import { requirePermission } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/auditLogger";
import { LawsuitStatus, Role } from "@prisma/client";
import { LAWSUIT_STATUS_VALUES } from "@/lib/litigation/constants";
import { revalidateModulePaths, isForeignKeyConstraintError, FK_DELETE_ERROR, type ActionResult } from "@/lib/server-action-utils";
import {
  notifyIfLawyerAssigned,
  notifyLawsuitAssignmentNonBlocking,
  notifyExpertsReferralIfNeeded,
} from "@/lib/notifications/assignment-matrix";

function parseFinancial(value: FormDataEntryValue | null): number {
  const num = value ? Number(value) : 0;
  return Number.isFinite(num) && num >= 0 ? num : 0;
}

export async function updateLawsuit(id: string, formData: FormData): Promise<ActionResult> {
  const gate = await requirePermission("LAWSUITS_UPDATE");
  if (!gate.success) return { success: false, error: gate.error };
  const session = gate.session;

  const existing = await prisma.lawsuit.findUnique({ where: { id } });
  if (!existing) return { success: false, error: "Lawsuit not found" };

  const caseNumber = (formData.get("caseNumber") as string)?.trim();
  const yearStr = formData.get("year") as string;
  const courtName = (formData.get("courtName") as string)?.trim();
  const opponentName = (formData.get("opponentName") as string)?.trim();
  const clientName = ((formData.get("clientName") as string)?.trim()) || "NJD";
  const archiveNumber = (formData.get("archiveNumber") as string)?.trim() || null;
  const registrationDateStr = formData.get("registrationDate") as string;
  const overallStatusRaw = (formData.get("overallStatus") as string)?.trim();
  const assignedLawyerId = formData.get("assignedLawyerId") as string;
  const isAtExperts = formData.get("isAtExperts") === "true";
  const expertOffice = (formData.get("expertOffice") as string)?.trim() || null;
  const expertName = (formData.get("expertName") as string)?.trim() || null;
  const expertFileNumber = (formData.get("expertFileNumber") as string)?.trim() || null;
  const awardedCompensation = parseFinancial(formData.get("awardedCompensation"));
  const judicialFees = parseFinancial(formData.get("judicialFees"));

  const year = parseInt(yearStr, 10);
  if (!caseNumber || !courtName || !opponentName || !assignedLawyerId) {
    return { success: false, error: "Missing required fields" };
  }
  if (isNaN(year) || year < 1900 || year > 2100) {
    return { success: false, error: "Invalid year" };
  }
  if (isAtExperts && (!expertOffice || !expertName || !expertFileNumber)) {
    return { success: false, error: "Expert fields are required" };
  }

  const registrationDate = registrationDateStr ? new Date(registrationDateStr) : existing.registrationDate;
  if (isNaN(registrationDate.getTime())) {
    return { success: false, error: "Invalid registration date" };
  }

  const overallStatus = LAWSUIT_STATUS_VALUES.includes(overallStatusRaw as LawsuitStatus)
    ? (overallStatusRaw as LawsuitStatus)
    : existing.overallStatus;

  const lawyer = await prisma.user.findFirst({
    where: { id: assignedLawyerId, role: Role.LAWYER },
  });
  if (!lawyer) return { success: false, error: "Invalid assigned lawyer" };

  await prisma.lawsuit.update({
    where: { id },
    data: {
      caseNumber,
      year,
      courtName,
      opponentName,
      clientName,
      archiveNumber,
      registrationDate,
      overallStatus,
      assignedLawyerId,
      isAtExperts,
      expertOffice: isAtExperts ? expertOffice : null,
      expertName: isAtExperts ? expertName : null,
      expertFileNumber: isAtExperts ? expertFileNumber : null,
      awardedCompensation,
      judicialFees,
    },
  });

  notifyIfLawyerAssigned(existing.assignedLawyerId, assignedLawyerId, lawyer, (assigned) =>
    notifyLawsuitAssignmentNonBlocking(
      assigned,
      caseNumber,
      year,
      courtName,
      opponentName,
      isAtExperts,
      expertOffice
    )
  );

  notifyExpertsReferralIfNeeded(existing.isAtExperts, isAtExperts, caseNumber, year);

  await logActivity(session.user.id, "UPDATE", "Lawsuit", id);
  revalidateModulePaths("/litigation", "/experts");
  return { success: true, id };
}

export async function deleteLawsuit(id: string): Promise<ActionResult> {
  const gate = await requirePermission("LAWSUITS_DELETE");
  if (!gate.success) return { success: false, error: gate.error };
  const session = gate.session;

  const existing = await prisma.lawsuit.findUnique({ where: { id } });
  if (!existing) return { success: false, error: "Lawsuit not found" };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.courtSession.deleteMany({ where: { lawsuitId: id } });
      await tx.executionRequest.deleteMany({ where: { lawsuitId: id } });
      await tx.lawsuitAttachment.deleteMany({ where: { lawsuitId: id } });
      await tx.lawsuit.delete({ where: { id } });
    });
    await logActivity(session.user.id, "DELETE", "Lawsuit", id);
    revalidateModulePaths("/litigation", "/experts", "/expenses");
    return { success: true };
  } catch (error) {
    if (isForeignKeyConstraintError(error)) {
      return { success: false, error: FK_DELETE_ERROR };
    }
    return { success: false, error: "Delete failed" };
  }
}
