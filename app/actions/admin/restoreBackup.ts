"use server";

import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { auth } from "@/lib/auth";
import { requireAuthenticatedSession } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

function reviveDates(row: Record<string, unknown>) {
  const next = { ...row };
  for (const [key, value] of Object.entries(next)) {
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
      next[key] = new Date(value);
    }
  }
  return next;
}

async function insertRows(
  createFn: (args: { data: never }) => Promise<unknown>,
  rows: unknown[],
  skipId?: string
) {
  for (const row of rows ?? []) {
    const data = reviveDates(row as Record<string, unknown>);
    if (skipId && data.id === skipId) continue;
    await createFn({ data: data as never });
  }
}

async function restoreDatabaseJson(payload: unknown, executorUserId: string) {
  if (!payload || typeof payload !== "object" || !("tables" in payload)) {
    return { success: false as const, error: "Invalid backup file format" };
  }

  const tables = (payload as { tables: Record<string, unknown[]> }).tables;
  const executorSnapshot = await prisma.user.findUnique({ where: { id: executorUserId } });
  if (!executorSnapshot) return { success: false as const, error: "Executor user not found" };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.auditLog.deleteMany({});
      await tx.expense.deleteMany({});
      await tx.legalDocument.deleteMany({});
      await tx.lawsuitAttachment.deleteMany({});
      await tx.executionRequest.deleteMany({});
      await tx.courtSession.deleteMany({});
      await tx.lawsuit.deleteMany({});
      await tx.prosecution.deleteMany({});
      await tx.legalTask.deleteMany({});
      await tx.powerOfAttorney.deleteMany({});
      await tx.contract.deleteMany({});
      await tx.gAFITask.deleteMany({});
      await tx.assemblyArchive.deleteMany({});
      await tx.subsidiaryCompany.deleteMany({});
      await tx.project.deleteMany({});
      await tx.courtLookup.deleteMany({});
      await tx.policeStationLookup.deleteMany({});
      await tx.expertOfficeLookup.deleteMany({});
      await tx.user.deleteMany({ where: { NOT: { id: executorUserId } } });

      await insertRows((a) => tx.user.create(a), tables.users, executorUserId);
      await insertRows((a) => tx.courtLookup.create(a), tables.courtLookups);
      await insertRows((a) => tx.policeStationLookup.create(a), tables.policeStationLookups);
      await insertRows((a) => tx.expertOfficeLookup.create(a), tables.expertOfficeLookups);
      await insertRows((a) => tx.project.create(a), tables.projects);
      await insertRows((a) => tx.subsidiaryCompany.create(a), tables.subsidiaryCompanies);
      await insertRows((a) => tx.gAFITask.create(a), tables.gafiTasks);
      await insertRows((a) => tx.lawsuit.create(a), tables.lawsuits);
      await insertRows((a) => tx.prosecution.create(a), tables.prosecutions);
      await insertRows((a) => tx.legalTask.create(a), tables.legalTasks);
      await insertRows((a) => tx.powerOfAttorney.create(a), tables.powerOfAttorneys);
      await insertRows((a) => tx.contract.create(a), tables.contracts);
      await insertRows((a) => tx.assemblyArchive.create(a), tables.assemblyArchives);
      await insertRows((a) => tx.lawsuitAttachment.create(a), tables.lawsuitAttachments);
      await insertRows((a) => tx.courtSession.create(a), tables.courtSessions);
      await insertRows((a) => tx.executionRequest.create(a), tables.executionRequests);
      await insertRows((a) => tx.expense.create(a), tables.expenses);
      await insertRows((a) => tx.legalDocument.create(a), tables.legalDocuments);
      await insertRows((a) => tx.auditLog.create(a), tables.auditLogs);

      await tx.user.update({
        where: { id: executorUserId },
        data: {
          name: executorSnapshot.name,
          email: executorSnapshot.email,
          passwordHash: executorSnapshot.passwordHash,
          phone: executorSnapshot.phone,
          role: executorSnapshot.role,
          permissions: executorSnapshot.permissions,
          isActive: executorSnapshot.isActive,
          isTwoFactorEnabled: executorSnapshot.isTwoFactorEnabled,
          secondaryEmail: executorSnapshot.secondaryEmail,
          requiresPasswordChange: executorSnapshot.requiresPasswordChange,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: executorUserId,
          action: "RESTORE_BACKUP",
          entityName: "System",
          entityId: executorUserId,
        },
      });
    });
    return { success: true as const };
  } catch {
    return { success: false as const, error: "Restore failed. No changes were committed." };
  }
}

export async function restoreBackup(jsonData: string, confirmation: string) {
  const gate = await requireAuthenticatedSession();
  if (!gate.success) {
    return { success: false, error: gate.error };
  }
  const session = gate.session;
  if (session.user.role !== Role.SUPER_ADMIN) {
    return { success: false, error: "Forbidden" };
  }
  if (confirmation.trim() !== "RESTORE") {
    return { success: false, error: "Confirmation text does not match" };
  }
  let payload: unknown;
  try {
    payload = JSON.parse(jsonData);
  } catch {
    return { success: false, error: "Invalid JSON file" };
  }
  const result = await restoreDatabaseJson(payload, session.user.id);
  if (!result.success) return result;
  revalidatePath("/", "layout");
  return { success: true };
}
