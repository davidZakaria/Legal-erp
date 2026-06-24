"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/auditLogger";
import { isManagerOrAbove } from "@/lib/rbac";
import { Role } from "@prisma/client";
import { notifyAssignmentNonBlocking } from "@/lib/email";

export async function createPowerOfAttorney(formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Unauthorized" };
  }

  if (!isManagerOrAbove(session.user.role)) {
    return { success: false, error: "Forbidden" };
  }

  const poaNumber = (formData.get("poaNumber") as string)?.trim();
  const clientName = (formData.get("clientName") as string)?.trim();
  const type = (formData.get("type") as string)?.trim();
  const expiryDateStr = formData.get("expiryDate") as string;
  const assignedLawyerId = formData.get("assignedLawyerId") as string;

  if (!poaNumber || !clientName || !type || !assignedLawyerId) {
    return { success: false, error: "Missing required fields" };
  }

  const expiryDate = expiryDateStr ? new Date(expiryDateStr) : null;
  if (expiryDateStr && expiryDate && isNaN(expiryDate.getTime())) {
    return { success: false, error: "Invalid expiry date" };
  }

  const lawyer = await prisma.user.findFirst({
    where: { id: assignedLawyerId, role: Role.LAWYER },
  });
  if (!lawyer) {
    return { success: false, error: "Invalid assigned lawyer" };
  }

  const poa = await prisma.powerOfAttorney.create({
    data: {
      poaNumber,
      clientName,
      type,
      expiryDate,
      assignedLawyerId,
    },
  });

  await logActivity(session.user.id, "CREATE", "PowerOfAttorney", poa.id);

  notifyAssignmentNonBlocking(
    lawyer,
    "توكيل رسمي",
    `تم تكليفك للتو بمتابعة توكيل رقم ${poaNumber} — ${clientName} — ${type}.`
  );

  revalidatePath("/ar");
  revalidatePath("/en");

  return { success: true, poaId: poa.id };
}
