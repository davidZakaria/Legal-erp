"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireAuthenticatedSession } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/auditLogger";
import { hasPermission } from "@/lib/permissions";

function parseOptionalDate(value: FormDataEntryValue | null): Date | null {
  const raw = (value as string)?.trim();
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function createSubsidiaryCompany(formData: FormData) {
  const gate = await requireAuthenticatedSession();
  if (!gate.success) {
    return { success: false, error: gate.error };
  }
  const session = gate.session;

  if (!(await hasPermission(session.user.id, "GAFI_CREATE", session.user.role))) {
    return { success: false, error: "Forbidden" };
  }

  const name = (formData.get("name") as string)?.trim();
  if (!name) {
    return { success: false, error: "Company name is required" };
  }

  const company = await prisma.subsidiaryCompany.create({
    data: {
      name,
      commercialRegister: (formData.get("commercialRegister") as string)?.trim() || null,
      crExpiryDate: parseOptionalDate(formData.get("crExpiryDate")),
      taxCard: (formData.get("taxCard") as string)?.trim() || null,
      taxCardExpiryDate: parseOptionalDate(formData.get("taxCardExpiryDate")),
      boardExpiryDate: parseOptionalDate(formData.get("boardExpiryDate")),
      capitalPaidDetails: (formData.get("capitalPaidDetails") as string)?.trim() || null,
    },
  });

  await logActivity(session.user.id, "CREATE", "SubsidiaryCompany", company.id);

  revalidatePath("/ar/gafi");
  revalidatePath("/en/gafi");

  return { success: true, companyId: company.id };
}
