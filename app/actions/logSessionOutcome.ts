"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireAuthenticatedSession } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/auditLogger";
import { canLogSessionOutcome } from "@/lib/rbac";
import { CourtSessionStatus } from "@prisma/client";
import { notifyManagersNonBlocking } from "@/lib/email";

export async function logSessionOutcome(formData: FormData, sessionId: string) {
  const gate = await requireAuthenticatedSession();
  if (!gate.success) {
    return { success: false, error: gate.error };
  }
  const session = gate.session;

  const sessionOutcome = formData.get("sessionOutcome") as string;
  const nextSessionDateStr = formData.get("nextSessionDate") as string;
  const nextRequiredAction = formData.get("nextRequiredAction") as string;

  if (!sessionOutcome?.trim()) {
    return { success: false, error: "Session outcome is required" };
  }

  const courtSession = await prisma.courtSession.findUnique({
    where: { id: sessionId },
    include: { lawsuit: true },
  });

  if (!courtSession) {
    return { success: false, error: "Session not found" };
  }

  if (
    !canLogSessionOutcome(
      session.user.role,
      session.user.id,
      courtSession.lawsuit.assignedLawyerId
    )
  ) {
    return { success: false, error: "Forbidden" };
  }

  const nextSessionDate = nextSessionDateStr
    ? new Date(nextSessionDateStr)
    : null;

  if (nextSessionDate && !nextRequiredAction?.trim()) {
    return {
      success: false,
      error: "Next required action is required when scheduling next session",
    };
  }

  await logActivity(
    session.user.id,
    "SESSION_OUTCOME",
    "CourtSession",
    sessionId
  );

  await prisma.$transaction(async (tx) => {
    await tx.courtSession.update({
      where: { id: sessionId },
      data: {
        status: CourtSessionStatus.COMPLETED,
        sessionOutcome: sessionOutcome.trim(),
        nextSessionDate: nextSessionDate,
      },
    });

    if (nextSessionDate) {
      await tx.courtSession.create({
        data: {
          lawsuitId: courtSession.lawsuitId,
          sessionDate: nextSessionDate,
          requiredAction: nextRequiredAction.trim(),
          sessionType: courtSession.sessionType,
          status: CourtSessionStatus.PENDING,
          isReminderSent: false,
        },
      });
    }
  });

  notifyManagersNonBlocking(
    session.user.name ?? "محامٍ",
    `إثبات قرار الجلسة: ${sessionOutcome.trim()} — دعوى رقم ${courtSession.lawsuit.caseNumber} لسنة ${courtSession.lawsuit.year}`
  );

  revalidatePath("/litigation");
  return { success: true };
}
