"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireAuthenticatedSession } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/auditLogger";
import { hasPermission } from "@/lib/permissions";

export async function returnLawsuitFromExperts(lawsuitId: string) {
  const gate = await requireAuthenticatedSession();
  if (!gate.success) {
    return { success: false, error: gate.error };
  }
  const session = gate.session;

  if (!(await hasPermission(session.user.id, "LAWSUITS_UPDATE", session.user.role))) {
    return { success: false, error: "Forbidden" };
  }

  const lawsuit = await prisma.lawsuit.findUnique({ where: { id: lawsuitId } });
  if (!lawsuit) {
    return { success: false, error: "Lawsuit not found" };
  }

  if (!lawsuit.isAtExperts) {
    return { success: false, error: "Lawsuit is not at experts" };
  }

  await prisma.lawsuit.update({
    where: { id: lawsuitId },
    data: { isAtExperts: false },
  });

  await logActivity(session.user.id, "RETURN_FROM_EXPERTS", "Lawsuit", lawsuitId);

  revalidatePath("/ar/experts");
  revalidatePath("/en/experts");
  revalidatePath("/ar/litigation");
  revalidatePath("/en/litigation");

  return { success: true };
}
