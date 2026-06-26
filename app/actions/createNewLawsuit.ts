"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireAuthenticatedSession } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/auditLogger";
import { hasPermission } from "@/lib/permissions";
import { CourtSessionStatus, LawsuitStatus, Role } from "@prisma/client";
import {
  LAWSUIT_STATUS_VALUES,
  SESSION_TYPE_COURT,
  SESSION_TYPE_EXPERT,
} from "@/lib/litigation/constants";
import { notifyAssignmentNonBlocking } from "@/lib/email";

function parseFinancial(value: FormDataEntryValue | null): number {
  const num = value ? Number(value) : 0;
  return Number.isFinite(num) && num >= 0 ? num : 0;
}

export async function createNewLawsuit(formData: FormData) {
  const gate = await requireAuthenticatedSession();
  if (!gate.success) {
    return { success: false, error: gate.error };
  }
  const session = gate.session;

  if (!(await hasPermission(session.user.id, "LAWSUITS_CREATE", session.user.role))) {
    return { success: false, error: "Forbidden" };
  }

  const caseNumber = (formData.get("caseNumber") as string)?.trim();
  const yearStr = formData.get("year") as string;
  const courtName = (formData.get("courtName") as string)?.trim();
  const opponentName = (formData.get("opponentName") as string)?.trim();
  const clientName = ((formData.get("clientName") as string)?.trim()) || "NJD";
  const archiveNumber = (formData.get("archiveNumber") as string)?.trim() || null;
  const registrationDateStr = formData.get("registrationDate") as string;
  const overallStatusRaw = (formData.get("overallStatus") as string)?.trim();
  const assignedLawyerId = formData.get("assignedLawyerId") as string;
  const firstSessionDateStr = formData.get("firstSessionDate") as string;
  const firstSessionRequiredAction = (
    formData.get("firstSessionRequiredAction") as string
  )?.trim();

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

  if (!firstSessionDateStr || !firstSessionRequiredAction) {
    return { success: false, error: "First session details are required" };
  }

  if (isAtExperts && (!expertOffice || !expertName || !expertFileNumber)) {
    return { success: false, error: "Expert office, name, and file number are required" };
  }

  const firstSessionDate = new Date(firstSessionDateStr);
  if (isNaN(firstSessionDate.getTime())) {
    return { success: false, error: "Invalid session date" };
  }

  const registrationDate = registrationDateStr ? new Date(registrationDateStr) : new Date();
  if (isNaN(registrationDate.getTime())) {
    return { success: false, error: "Invalid registration date" };
  }

  const overallStatus = LAWSUIT_STATUS_VALUES.includes(overallStatusRaw as LawsuitStatus)
    ? (overallStatusRaw as LawsuitStatus)
    : LawsuitStatus.UNDER_REVIEW;

  const lawyer = await prisma.user.findFirst({
    where: { id: assignedLawyerId, role: Role.LAWYER },
  });

  if (!lawyer) {
    return { success: false, error: "Invalid assigned lawyer" };
  }

  const sessionType = isAtExperts ? SESSION_TYPE_EXPERT : SESSION_TYPE_COURT;

  const lawsuit = await prisma.$transaction(async (tx) => {
    const created = await tx.lawsuit.create({
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

    await tx.courtSession.create({
      data: {
        lawsuitId: created.id,
        sessionDate: firstSessionDate,
        requiredAction: firstSessionRequiredAction,
        sessionType,
        status: CourtSessionStatus.PENDING,
        isReminderSent: false,
      },
    });

    return created;
  });

  await logActivity(session.user.id, "CREATE", "Lawsuit", lawsuit.id);

  notifyAssignmentNonBlocking(
    lawyer,
    isAtExperts ? "دعوى محالة للخبراء" : "دعوى جديدة",
    isAtExperts
      ? `تم تكليفك بمتابعة دعوى رقم ${caseNumber}/${year} — محالة لـ ${expertOffice} (ملف ${expertFileNumber}).`
      : `تم تكليفك للتو بمتابعة دعوى رقم ${caseNumber} لسنة ${year} — ${courtName} ضد ${opponentName}.`
  );

  revalidatePath("/ar/litigation");
  revalidatePath("/en/litigation");
  revalidatePath("/ar/experts");
  revalidatePath("/en/experts");

  return { success: true, lawsuitId: lawsuit.id };
}
