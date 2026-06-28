"use server";

import { revalidatePath } from "next/cache";
import fs from "fs/promises";
import path from "path";
import { Role } from "@prisma/client";
import { requireAuthenticatedSession } from "@/lib/auth-guards";
import { logActivity } from "@/lib/auditLogger";
import { prisma } from "@/lib/prisma";
import { restoreBackup } from "@/app/actions/admin/restoreBackup";
import {
  generateAdvancedBackup as runAdvancedBackup,
  BACKUP_MAX_COUNT,
  BACKUP_RETENTION_DAYS,
  BACKUP_DIR,
  cleanupExpiredBackups,
  deleteBackupFile,
  extractJsonFromBackupFile,
  verifyBackupFile,
} from "@/lib/backup-engine";

async function assertSuperAdmin() {
  const gate = await requireAuthenticatedSession();
  if (!gate.success || gate.session.user.role !== Role.SUPER_ADMIN) {
    return null;
  }
  return gate.session;
}

function revalidateBackupPages() {
  revalidatePath("/ar/admin/backups");
  revalidatePath("/en/admin/backups");
}

export type BackupLogRow = {
  id: string;
  shortId: string;
  fileName: string;
  type: string;
  size: string | null;
  files: number;
  isEncrypted: boolean;
  filePath: string | null;
  createdAt: string;
};

export async function getBackupPageData() {
  const session = await assertSuperAdmin();
  if (!session) {
    return null;
  }

  const logs = await prisma.backupLog.findMany({
    orderBy: { createdAt: "desc" },
  });

  return {
    logs: logs.map((log) => ({
      id: log.id,
      shortId: log.id.slice(0, 8).toUpperCase(),
      fileName: log.fileName,
      type: log.type,
      size: log.size,
      files: log.files,
      isEncrypted: log.isEncrypted,
      filePath: log.filePath,
      createdAt: log.createdAt.toISOString(),
    })),
    stats: {
      totalBackups: logs.length,
      retentionDays: BACKUP_RETENTION_DAYS,
      maxBackups: BACKUP_MAX_COUNT,
      encryptionConfigured: Boolean(process.env.BACKUP_SECRET_KEY?.trim()),
    },
  };
}

export async function generateAdvancedBackup(isEncrypted: boolean) {
  const session = await assertSuperAdmin();
  if (!session) {
    return { success: false as const, error: "Forbidden" };
  }

  try {
    const result = await runAdvancedBackup(isEncrypted);

    await logActivity(
      session.user.id,
      isEncrypted ? "CREATE_ENCRYPTED_BACKUP" : "CREATE_BACKUP",
      "BackupLog",
      result.logId
    );

    revalidateBackupPages();

    return { success: true as const, ...result };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Backup failed";
    return { success: false as const, error: message };
  }
}

export async function deleteBackup(logId: string) {
  const session = await assertSuperAdmin();
  if (!session) {
    return { success: false as const, error: "Forbidden" };
  }

  const log = await prisma.backupLog.findUnique({ where: { id: logId } });
  if (!log) {
    return { success: false as const, error: "Backup not found" };
  }

  await deleteBackupFile(log.filePath);
  await prisma.backupLog.delete({ where: { id: logId } });

  await logActivity(session.user.id, "DELETE_BACKUP", "BackupLog", logId);
  revalidateBackupPages();

  return { success: true as const };
}

export async function verifyBackup(logId: string) {
  const session = await assertSuperAdmin();
  if (!session) {
    return { success: false as const, error: "Forbidden" };
  }

  const log = await prisma.backupLog.findUnique({ where: { id: logId } });
  if (!log?.filePath) {
    return { success: false as const, error: "Backup file not found" };
  }

  const result = await verifyBackupFile(log.filePath, log.isEncrypted);
  if (!result.valid) {
    return { success: false as const, error: result.error ?? "Verification failed" };
  }

  return { success: true as const, tableCount: result.tableCount ?? 0 };
}

export async function restoreBackupFromLog(logId: string, confirmation: string) {
  const session = await assertSuperAdmin();
  if (!session) {
    return { success: false as const, error: "Forbidden" };
  }

  const log = await prisma.backupLog.findUnique({ where: { id: logId } });
  if (!log?.filePath) {
    return { success: false as const, error: "Backup file not found" };
  }

  try {
    const json = await extractJsonFromBackupFile(log.filePath, log.isEncrypted);
    const result = await restoreBackup(json, confirmation);
    if (!result.success) {
      return { success: false as const, error: result.error ?? "Restore failed" };
    }
    revalidateBackupPages();
    return { success: true as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Restore failed";
    return { success: false as const, error: message };
  }
}

export async function cleanupBackups() {
  const session = await assertSuperAdmin();
  if (!session) {
    return { success: false as const, error: "Forbidden" };
  }

  const removed = await cleanupExpiredBackups();
  await logActivity(session.user.id, "CLEANUP_BACKUPS", "BackupLog", session.user.id);
  revalidateBackupPages();

  return { success: true as const, removed };
}

export async function importBackupZip(formData: FormData, confirmation: string) {
  const session = await assertSuperAdmin();
  if (!session) {
    return { success: false as const, error: "Forbidden" };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { success: false as const, error: "No backup file selected" };
  }

  await fs.mkdir(BACKUP_DIR, { recursive: true });
  const tempPath = path.join(BACKUP_DIR, `_import_${Date.now()}.zip`);

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(tempPath, buffer);

    const json = await extractJsonFromBackupFile(tempPath);
    const result = await restoreBackup(json, confirmation);
    if (!result.success) {
      return { success: false as const, error: result.error ?? "Import restore failed" };
    }

    await logActivity(session.user.id, "IMPORT_BACKUP", "BackupLog", session.user.id);
    revalidateBackupPages();
    return { success: true as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import failed";
    return { success: false as const, error: message };
  } finally {
    await fs.unlink(tempPath).catch(() => {});
  }
}
