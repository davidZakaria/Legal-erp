"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/auditLogger";
import { hasPermission } from "@/lib/permissions";
import { CourtSessionStatus } from "@prisma/client";
import { SESSION_TYPE_EXPERT } from "@/lib/litigation/constants";

export async function createExpertSession(formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Unauthorized" };
  }

  if (!(await hasPermission(session.user.id, "LAWSUITS_UPDATE", session.user.role))) {
    return { success: false, error: "Forbidden" };
  }

  const lawsuitId = formData.get("lawsuitId") as string;
  const sessionDateStr = formData.get("sessionDate") as string;
  const requiredAction = (formData.get("requiredAction") as string)?.trim();

  if (!lawsuitId || !sessionDateStr || !requiredAction) {
    return { success: false, error: "Missing required fields" };
  }

  const lawsuit = await prisma.lawsuit.findUnique({ where: { id: lawsuitId } });
  if (!lawsuit) {
    return { success: false, error: "Lawsuit not found" };
  }

  if (!lawsuit.isAtExperts) {
    return { success: false, error: "Lawsuit is not at experts" };
  }

  const sessionDate = new Date(sessionDateStr);
  if (Number.isNaN(sessionDate.getTime())) {
    return { success: false, error: "Invalid session date" };
  }

  const courtSession = await prisma.courtSession.create({
    data: {
      lawsuitId,
      sessionDate,
      requiredAction,
      sessionType: SESSION_TYPE_EXPERT,
      status: CourtSessionStatus.PENDING,
    },
  });

  await logActivity(session.user.id, "CREATE", "CourtSession", courtSession.id);

  revalidatePath("/ar/experts");
  revalidatePath("/en/experts");
  revalidatePath("/ar/litigation");
  revalidatePath("/en/litigation");

  return { success: true, sessionId: courtSession.id };
}
