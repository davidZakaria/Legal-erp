"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/auditLogger";
import { canManageProsecutions } from "@/lib/rbac";
import { PROSECUTION_ISSUE_TYPES } from "@/lib/prosecutions/constants";

export async function createProsecution(formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Unauthorized" };
  }

  if (!canManageProsecutions(session.user.role)) {
    return { success: false, error: "Forbidden" };
  }

  const caseNumber = (formData.get("caseNumber") as string)?.trim();
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
      year,
      policeStation,
      clientName,
      issueType,
      assignedLawyerId,
    },
  });

  await logActivity(session.user.id, "CREATE", "Prosecution", prosecution.id);

  revalidatePath("/ar/prosecutions");
  revalidatePath("/en/prosecutions");

  return { success: true, prosecutionId: prosecution.id };
}
