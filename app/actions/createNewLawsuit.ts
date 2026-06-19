"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/auditLogger";
import { canCreateLawsuit } from "@/lib/rbac";
import { CourtSessionStatus, Role } from "@prisma/client";

export async function createNewLawsuit(formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Unauthorized" };
  }

  if (!canCreateLawsuit(session.user.role)) {
    return { success: false, error: "Forbidden" };
  }

  const caseNumber = (formData.get("caseNumber") as string)?.trim();
  const yearStr = formData.get("year") as string;
  const courtName = (formData.get("courtName") as string)?.trim();
  const opponentName = (formData.get("opponentName") as string)?.trim();
  const assignedLawyerId = formData.get("assignedLawyerId") as string;
  const firstSessionDateStr = formData.get("firstSessionDate") as string;
  const firstSessionRequiredAction = (
    formData.get("firstSessionRequiredAction") as string
  )?.trim();

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

  const firstSessionDate = new Date(firstSessionDateStr);
  if (isNaN(firstSessionDate.getTime())) {
    return { success: false, error: "Invalid session date" };
  }

  const lawyer = await prisma.user.findFirst({
    where: { id: assignedLawyerId, role: Role.LAWYER },
  });

  if (!lawyer) {
    return { success: false, error: "Invalid assigned lawyer" };
  }

  const lawsuit = await prisma.$transaction(async (tx) => {
    const created = await tx.lawsuit.create({
      data: {
        caseNumber,
        year,
        courtName,
        opponentName,
        assignedLawyerId,
      },
    });

    await tx.courtSession.create({
      data: {
        lawsuitId: created.id,
        sessionDate: firstSessionDate,
        requiredAction: firstSessionRequiredAction,
        status: CourtSessionStatus.PENDING,
        isReminderSent: false,
      },
    });

    return created;
  });

  await logActivity(session.user.id, "CREATE", "Lawsuit", lawsuit.id);

  revalidatePath("/ar/litigation");
  revalidatePath("/en/litigation");

  return { success: true, lawsuitId: lawsuit.id };
}
