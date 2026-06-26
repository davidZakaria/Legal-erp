"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/auditLogger";
import { hasPermission } from "@/lib/permissions";
import { Role } from "@prisma/client";
import type { BulkLawsuitRow } from "@/lib/litigation/constants";

export async function bulkInsertLawsuits(rows: BulkLawsuitRow[]) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Unauthorized" };
  }

  if (!(await hasPermission(session.user.id, "LAWSUITS_CREATE", session.user.role))) {
    return { success: false, error: "Forbidden" };
  }

  if (!rows.length) {
    return { success: false, error: "No rows to import" };
  }

  if (rows.length > 500) {
    return { success: false, error: "Maximum 500 rows per import" };
  }

  const lawyers = await prisma.user.findMany({
    where: { role: Role.LAWYER },
    select: { id: true, email: true },
  });
  const lawyerByEmail = new Map(lawyers.map((l) => [l.email.toLowerCase(), l.id]));

  const validRows: Array<{
    caseNumber: string;
    year: number;
    courtName: string;
    opponentName: string;
    assignedLawyerId: string;
  }> = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const caseNumber = row.caseNumber?.trim();
    const courtName = row.courtName?.trim();
    const opponentName = row.opponentName?.trim();
    const email = row.assignedLawyerEmail?.trim().toLowerCase();
    const year = Number(row.year);

    if (!caseNumber || !courtName || !opponentName || !email) {
      return { success: false, error: `Row ${i + 1}: missing required fields` };
    }

    if (!Number.isInteger(year) || year < 1900 || year > 2100) {
      return { success: false, error: `Row ${i + 1}: invalid year` };
    }

    const lawyerId = lawyerByEmail.get(email);
    if (!lawyerId) {
      return { success: false, error: `Row ${i + 1}: lawyer not found (${email})` };
    }

    validRows.push({
      caseNumber,
      year,
      courtName,
      opponentName,
      assignedLawyerId: lawyerId,
    });
  }

  const existing = await prisma.lawsuit.findMany({
    where: {
      OR: validRows.map((row) => ({
        caseNumber: row.caseNumber,
        year: row.year,
      })),
    },
    select: { caseNumber: true, year: true },
  });
  const existingKeys = new Set(
    existing.map((row) => `${row.caseNumber}:${row.year}`)
  );
  const toInsert = validRows.filter(
    (row) => !existingKeys.has(`${row.caseNumber}:${row.year}`)
  );

  if (!toInsert.length) {
    return { success: false, error: "All rows already exist in the system" };
  }

  const result = await prisma.lawsuit.createMany({
    data: toInsert,
  });

  await logActivity(session.user.id, "BULK_IMPORT", "Lawsuit", String(result.count));

  revalidatePath("/ar/litigation");
  revalidatePath("/en/litigation");
  revalidatePath("/ar");
  revalidatePath("/en");

  return { success: true, imported: result.count };
}
