"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireAuthenticatedSession } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/auditLogger";
import { hasPermission } from "@/lib/permissions";
import { PROSECUTION_ISSUE_TYPES } from "@/lib/prosecutions/constants";
import { notifyAssignmentNonBlocking } from "@/lib/email";

export async function createProsecution(formData: FormData) {
  const gate = await requireAuthenticatedSession();
  if (!gate.success) {
    return { success: false, error: gate.error };
  }
  const session = gate.session;

  if (!(await hasPermission(session.user.id, "PROSECUTIONS_CREATE", session.user.role))) {
    return { success: false, error: "Forbidden" };
  }

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
  if (!lawyer) {
    return { success: false, error: "Lawyer not found" };
  }

  const prosecution = await prisma.prosecution.create({
    data: {
      caseNumber,
      reportNumber,
      year,
      policeStation,
      clientName,
      issueType,
      assignedLawyerId,
    },
  });

  await logActivity(session.user.id, "CREATE", "Prosecution", prosecution.id);

  notifyAssignmentNonBlocking(
    lawyer,
    "نيابة / محضر جديد",
    `تم تكليفك للتو بمتابعة محضر رقم ${caseNumber}/${year} — ${policeStation} — ${issueType} — ${clientName}.`
  );

  revalidatePath("/ar/prosecutions");
  revalidatePath("/en/prosecutions");

  return { success: true, prosecutionId: prosecution.id };
}
