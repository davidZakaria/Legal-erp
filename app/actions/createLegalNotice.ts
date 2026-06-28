"use server";

import { LegalNoticeDeliveryStatus } from "@prisma/client";
import { requireAuthenticatedSession } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/auditLogger";
import { hasPermission } from "@/lib/permissions";
import { revalidateModulePaths } from "@/lib/server-action-utils";
import { LEGAL_NOTICE_TYPES } from "@/lib/notices/constants";
import { notifyNoticeAssignmentNonBlocking } from "@/lib/notices/notifications";

function parseOptionalDate(raw: FormDataEntryValue | null): Date | null {
  if (!raw || typeof raw !== "string" || !raw.trim()) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseRequiredDate(raw: FormDataEntryValue | null): Date | null {
  const date = parseOptionalDate(raw);
  return date;
}

export async function createLegalNotice(formData: FormData) {
  const gate = await requireAuthenticatedSession();
  if (!gate.success) {
    return { success: false as const, error: gate.error };
  }
  const session = gate.session;

  if (!(await hasPermission(session.user.id, "NOTICES_CREATE", session.user.role))) {
    return { success: false as const, error: "Forbidden" };
  }

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

  if (
    !year ||
    !bailiffOffice ||
    !clientName ||
    !opponentName ||
    !noticeType ||
    !assignedLawyerId ||
    !submissionDate
  ) {
    return { success: false as const, error: "Missing required fields" };
  }

  if (!LEGAL_NOTICE_TYPES.includes(noticeType as (typeof LEGAL_NOTICE_TYPES)[number])) {
    return { success: false as const, error: "Invalid notice type" };
  }

  const lawyer = await prisma.user.findUnique({ where: { id: assignedLawyerId } });
  if (!lawyer) {
    return { success: false as const, error: "Lawyer not found" };
  }

  if (contractId) {
    const contract = await prisma.contract.findUnique({ where: { id: contractId } });
    if (!contract) return { success: false as const, error: "Contract not found" };
  }

  if (lawsuitId) {
    const lawsuit = await prisma.lawsuit.findUnique({ where: { id: lawsuitId } });
    if (!lawsuit) return { success: false as const, error: "Lawsuit not found" };
  }

  const notice = await prisma.legalNotice.create({
    data: {
      noticeNumber,
      year,
      bailiffOffice,
      clientName,
      opponentName,
      noticeType,
      submissionDate,
      followUpDate,
      assignedLawyerId,
      contractId,
      lawsuitId,
      notes,
      deliveryStatus: LegalNoticeDeliveryStatus.PENDING,
    },
  });

  await logActivity(session.user.id, "CREATE", "LegalNotice", notice.id);
  revalidateModulePaths("/notices", "/contracts", "/litigation", "/");

  notifyNoticeAssignmentNonBlocking(
    { id: lawyer.id, email: lawyer.email, name: lawyer.name },
    noticeType,
    opponentName,
    bailiffOffice
  );

  return { success: true as const, id: notice.id };
}
