"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/auditLogger";
import { isManagerOrAbove } from "@/lib/rbac";

function parseFinancial(value: FormDataEntryValue | null): number {
  const num = value ? Number(value) : 0;
  return Number.isFinite(num) && num >= 0 ? num : 0;
}

export async function updateLawsuitDetails(formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Unauthorized" };
  }

  if (!isManagerOrAbove(session.user.role)) {
    return { success: false, error: "Forbidden" };
  }

  const lawsuitId = formData.get("lawsuitId") as string;
  if (!lawsuitId) {
    return { success: false, error: "Missing lawsuit ID" };
  }

  const existing = await prisma.lawsuit.findUnique({ where: { id: lawsuitId } });
  if (!existing) {
    return { success: false, error: "Lawsuit not found" };
  }

  const isAtExperts = formData.get("isAtExperts") === "true";
  const expertOffice = (formData.get("expertOffice") as string)?.trim() || null;
  const expertName = (formData.get("expertName") as string)?.trim() || null;
  const expertFileNumber = (formData.get("expertFileNumber") as string)?.trim() || null;
  const awardedCompensation = parseFinancial(formData.get("awardedCompensation"));
  const judicialFees = parseFinancial(formData.get("judicialFees"));

  if (isAtExperts && (!expertOffice || !expertName || !expertFileNumber)) {
    return {
      success: false,
      error: "Expert office, name, and file number are required when referred to experts",
    };
  }

  await prisma.lawsuit.update({
    where: { id: lawsuitId },
    data: {
      isAtExperts,
      expertOffice: isAtExperts ? expertOffice : null,
      expertName: isAtExperts ? expertName : null,
      expertFileNumber: isAtExperts ? expertFileNumber : null,
      awardedCompensation,
      judicialFees,
    },
  });

  await logActivity(session.user.id, "UPDATE", "Lawsuit", lawsuitId);

  revalidatePath("/ar/litigation");
  revalidatePath("/en/litigation");
  revalidatePath("/ar/experts");
  revalidatePath("/en/experts");

  return { success: true };
}
