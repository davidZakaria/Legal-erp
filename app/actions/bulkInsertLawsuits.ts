"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireAuthenticatedSession } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/auditLogger";
import { hasPermission } from "@/lib/permissions";
import { Role } from "@prisma/client";
import type { BulkLawsuitRow } from "@/lib/litigation/constants";
import { notifyLawsuitAssignmentNonBlocking } from "@/lib/notifications/assignment-matrix";

export async function bulkInsertLawsuits(rows: BulkLawsuitRow[]) {
  const gate = await requireAuthenticatedSession();
  if (!gate.success) {
    return { success: false, error: gate.error };
  }
  const session = gate.session;

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
    select: { id: true, email: true, name: true },
  });
  const lawyerByEmail = new Map(lawyers.map((l) => [l.email.toLowerCase(), l]));
  const lawyerById = new Map(lawyers.map((l) => [l.id, l]));

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

    const lawyer = lawyerByEmail.get(email);
    if (!lawyer) {
      return { success: false, error: `Row ${i + 1}: lawyer not found (${email})` };
    }

    validRows.push({
      caseNumber,
      year,
      courtName,
      opponentName,
      assignedLawyerId: lawyer.id,
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

  const notifiedLawyers = new Set<string>();
  for (const row of toInsert) {
    if (notifiedLawyers.has(row.assignedLawyerId)) continue;
    const lawyer = lawyerById.get(row.assignedLawyerId);
    if (!lawyer) continue;
    notifiedLawyers.add(row.assignedLawyerId);
    const lawyerRows = toInsert.filter((r) => r.assignedLawyerId === row.assignedLawyerId);
    const first = lawyerRows[0]!;
    if (lawyerRows.length === 1) {
      notifyLawsuitAssignmentNonBlocking(
        lawyer,
        first.caseNumber,
        first.year,
        first.courtName,
        first.opponentName
      );
    } else {
      notifyLawsuitAssignmentNonBlocking(
        lawyer,
        `${lawyerRows.length} دعاوى`,
        first.year,
        first.courtName,
        `${lawyerRows.length} خصوم (استيراد جماعي)`
      );
    }
  }

  revalidatePath("/ar/litigation");
  revalidatePath("/en/litigation");
  revalidatePath("/ar");
  revalidatePath("/en");

  return { success: true, imported: result.count };
}
