"use server";

import { LegalNoticeDeliveryStatus } from "@prisma/client";
import { requirePermission } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/auditLogger";
import { LEGAL_NOTICE_TYPES } from "@/lib/notices/constants";
import {
  FK_DELETE_ERROR,
  isForeignKeyConstraintError,
  revalidateModulePaths,
  type ActionResult,
} from "@/lib/server-action-utils";
import { notifyDeliveryStatusChangeIfNeeded } from "@/lib/notices/notifications";
import {
  notifyIfLawyerAssigned,
  notifyLegalNoticeAssignmentNonBlocking,
} from "@/lib/notifications/assignment-matrix";

function parseOptionalDate(raw: FormDataEntryValue | null): Date | null {
  if (!raw || typeof raw !== "string" || !raw.trim()) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseRequiredDate(raw: FormDataEntryValue | null): Date | null {
  return parseOptionalDate(raw);
}

const DELIVERY_STATUSES = new Set<string>(Object.values(LegalNoticeDeliveryStatus));

export async function updateLegalNotice(id: string, formData: FormData): Promise<ActionResult> {
  const gate = await requirePermission("NOTICES_UPDATE");
  if (!gate.success) return { success: false, error: gate.error };
  const session = gate.session;

  const existing = await prisma.legalNotice.findUnique({ where: { id } });
  if (!existing) return { success: false, error: "Notice not found" };

  const noticeNumber = (formData.get("noticeNumber") as string)?.trim() || null;
  const year = (formData.get("year") as string)?.trim();
  const bailiffOffice = (formData.get("bailiffOffice") as string)?.trim();
  const clientName = (formData.get("clientName") as string)?.trim();
  const opponentName = (formData.get("opponentName") as string)?.trim();
  const noticeType = (formData.get("noticeType") as string)?.trim();
  const assignedLawyerId = formData.get("assignedLawyerId") as string;
  const notes = (formData.get("notes") as string)?.trim() || null;
  const contractIdRaw = (formData.get("contractId") as string)?.trim();
  const lawsuitIdRaw = (formData.get("lawsuitId") as string)?.trim();
  const contractId = contractIdRaw || null;
  const lawsuitId = lawsuitIdRaw || null;
  const submissionDate = parseRequiredDate(formData.get("submissionDate"));
  const followUpDate = parseOptionalDate(formData.get("followUpDate"));
  const deliveryDate = parseOptionalDate(formData.get("deliveryDate"));
  const deliveryStatusRaw = (formData.get("deliveryStatus") as string)?.trim();

  if (
    !year ||
    !bailiffOffice ||
    !clientName ||
    !opponentName ||
    !noticeType ||
    !assignedLawyerId ||
    !submissionDate ||
    !deliveryStatusRaw ||
    !DELIVERY_STATUSES.has(deliveryStatusRaw)
  ) {
    return { success: false, error: "Missing required fields" };
  }

  if (!LEGAL_NOTICE_TYPES.includes(noticeType as (typeof LEGAL_NOTICE_TYPES)[number])) {
    return { success: false, error: "Invalid notice type" };
  }

  const lawyer = await prisma.user.findUnique({ where: { id: assignedLawyerId } });
  if (!lawyer) return { success: false, error: "Lawyer not found" };

  if (contractId) {
    const contract = await prisma.contract.findUnique({ where: { id: contractId } });
    if (!contract) return { success: false, error: "Contract not found" };
  }

  if (lawsuitId) {
    const lawsuit = await prisma.lawsuit.findUnique({ where: { id: lawsuitId } });
    if (!lawsuit) return { success: false, error: "Lawsuit not found" };
  }

  await prisma.legalNotice.update({
    where: { id },
    data: {
      noticeNumber,
      year,
      bailiffOffice,
      clientName,
      opponentName,
      noticeType,
      submissionDate,
      followUpDate,
      deliveryDate,
      deliveryStatus: deliveryStatusRaw as LegalNoticeDeliveryStatus,
      assignedLawyerId,
      contractId,
      lawsuitId,
      notes,
    },
  });

  notifyDeliveryStatusChangeIfNeeded(
    existing.deliveryStatus,
    deliveryStatusRaw as LegalNoticeDeliveryStatus,
    opponentName
  );

  notifyIfLawyerAssigned(existing.assignedLawyerId, assignedLawyerId, lawyer, (assigned) =>
    notifyLegalNoticeAssignmentNonBlocking(assigned, opponentName, noticeType, bailiffOffice)
  );

  await logActivity(session.user.id, "UPDATE", "LegalNotice", id);
  revalidateModulePaths("/notices", "/contracts", "/litigation", "/");
  return { success: true, id };
}

export async function deleteLegalNotice(id: string): Promise<ActionResult> {
  const gate = await requirePermission("NOTICES_DELETE");
  if (!gate.success) return { success: false, error: gate.error };
  const session = gate.session;

  try {
    await prisma.legalNotice.delete({ where: { id } });
    await logActivity(session.user.id, "DELETE", "LegalNotice", id);
    revalidateModulePaths("/notices");
    return { success: true };
  } catch (error) {
    if (isForeignKeyConstraintError(error)) {
      return { success: false, error: FK_DELETE_ERROR };
    }
    return { success: false, error: "Delete failed" };
  }
}
