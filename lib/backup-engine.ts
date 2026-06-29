import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { createWriteStream } from "fs";
import fs from "fs/promises";
import path from "path";
import { format, subDays } from "date-fns";
import { ZipArchive } from "archiver";
import yauzl from "yauzl";
import { BackupType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { exportDatabaseJson, stringifyBackup } from "@/lib/backup";
import {
  BACKUP_MANIFEST_FILE,
  collectSystemFiles,
  resolveArchivePathToProjectPath,
  summarizeManifestFiles,
  toManifestPreview,
  type BackupManifest,
  type BackupManifestPreview,
} from "@/lib/backup-manifest";

export const BACKUP_DIR = path.join(process.cwd(), "private", "backups");

export const BACKUP_RETENTION_DAYS = 30;
export const BACKUP_MAX_COUNT = 50;

export type AdvancedBackupResult = {
  logId: string;
  fileName: string;
  filePath: string;
  size: string;
  files: number;
  isEncrypted: boolean;
  preview: BackupManifestPreview;
};

function getEncryptionKey(): Buffer {
  const secret = process.env.BACKUP_SECRET_KEY?.trim();
  if (!secret) {
    throw new Error("BACKUP_SECRET_KEY is not configured");
  }
  return createHash("sha256").update(secret).digest();
}

export function encryptBackupPayload(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-cbc", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  return Buffer.concat([iv, encrypted]).toString("base64");
}

export function decryptBackupPayload(encoded: string): string {
  const key = getEncryptionKey();
  const buffer = Buffer.from(encoded, "base64");
  const iv = buffer.subarray(0, 16);
  const ciphertext = buffer.subarray(16);
  const decipher = createDecipheriv("aes-256-cbc", key, iv);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString("utf8");
}

export function formatBackupSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
}

export function buildAdvancedBackupFileName(
  isEncrypted: boolean,
  type: BackupType = BackupType.MANUAL,
  date = new Date()
) {
  const stamp = format(date, "yyyyMMdd_HHmmss");
  const suffix = isEncrypted ? "_encrypted" : "";
  const autoTag = type === BackupType.AUTO ? "_auto" : "";
  return `NJD_Backup_${stamp}${autoTag}${suffix}.zip`;
}

export async function ensureBackupDir() {
  await fs.mkdir(BACKUP_DIR, { recursive: true });
}

async function writeFullBackupZip(
  zipPath: string,
  databaseInnerName: string,
  databaseContent: string,
  manifest: BackupManifest
): Promise<number> {
  await ensureBackupDir();

  await new Promise<void>((resolve, reject) => {
    const output = createWriteStream(zipPath);
    const archive = new ZipArchive({ zlib: { level: 9 } });

    output.on("close", () => resolve());
    output.on("error", reject);
    archive.on("error", reject);

    archive.pipe(output);
    archive.append(databaseContent, { name: databaseInnerName });
    archive.append(JSON.stringify(manifest, null, 2), { name: BACKUP_MANIFEST_FILE });

    for (const file of manifest.files) {
      const diskPath = resolveArchivePathToProjectPath(file.archivePath);
      if (!diskPath) continue;
      archive.file(diskPath, { name: file.archivePath });
    }

    void archive.finalize();
  });

  const stats = await fs.stat(zipPath);
  return stats.size;
}

export async function generateAdvancedBackup(options?: {
  isEncrypted?: boolean;
  type?: BackupType;
}): Promise<AdvancedBackupResult> {
  const isEncrypted = options?.isEncrypted ?? false;
  const type = options?.type ?? BackupType.MANUAL;

  if (isEncrypted && !process.env.BACKUP_SECRET_KEY?.trim()) {
    throw new Error("BACKUP_SECRET_KEY is required for encrypted backups");
  }

  const payload = await exportDatabaseJson();
  const json = stringifyBackup(payload);
  const systemFiles = await collectSystemFiles();
  const manifest = summarizeManifestFiles(
    systemFiles,
    Object.keys(payload.tables).length
  );
  const preview = toManifestPreview(manifest);

  const innerFileName = isEncrypted ? "database.enc" : "database.json";
  const archiveContent = isEncrypted ? encryptBackupPayload(json) : json;

  const fileName = buildAdvancedBackupFileName(isEncrypted, type);
  const filePath = path.join(BACKUP_DIR, fileName);
  const zipBytes = await writeFullBackupZip(filePath, innerFileName, archiveContent, manifest);
  const size = formatBackupSize(zipBytes);

  const log = await prisma.backupLog.create({
    data: {
      fileName,
      type,
      size,
      files: manifest.totalFiles,
      isEncrypted,
      filePath,
      manifestPreview: preview,
    },
  });

  return {
    logId: log.id,
    fileName,
    filePath,
    size,
    files: manifest.totalFiles,
    isEncrypted,
    preview,
  };
}

export function resolveSafeBackupPath(filePath: string): string | null {
  const resolved = path.resolve(filePath);
  const backupRoot = path.resolve(BACKUP_DIR);
  if (resolved !== backupRoot && !resolved.startsWith(`${backupRoot}${path.sep}`)) {
    return null;
  }
  return resolved;
}

function openZip(filePath: string): Promise<yauzl.ZipFile> {
  return new Promise((resolve, reject) => {
    yauzl.open(filePath, { lazyEntries: true }, (error, zipfile) => {
      if (error || !zipfile) {
        reject(error ?? new Error("Failed to open zip archive"));
        return;
      }
      resolve(zipfile);
    });
  });
}

async function listZipEntryNames(zipPath: string): Promise<string[]> {
  const zipfile = await openZip(zipPath);
  const names: string[] = [];

  return new Promise((resolve, reject) => {
    zipfile.on("entry", (entry) => {
      names.push(entry.fileName);
      zipfile.readEntry();
    });
    zipfile.on("end", () => resolve(names));
    zipfile.on("error", reject);
    zipfile.readEntry();
  });
}

async function readZipEntryBuffer(zipPath: string, entryName: string): Promise<Buffer> {
  const zipfile = await openZip(zipPath);

  return new Promise((resolve, reject) => {
    zipfile.on("entry", (entry) => {
      if (entry.fileName !== entryName) {
        zipfile.readEntry();
        return;
      }

      zipfile.openReadStream(entry, (error, readStream) => {
        if (error || !readStream) {
          reject(error ?? new Error(`Failed to read ${entryName}`));
          return;
        }

        const chunks: Buffer[] = [];
        readStream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        readStream.on("end", () => resolve(Buffer.concat(chunks)));
        readStream.on("error", reject);
      });
    });

    zipfile.on("error", reject);
    zipfile.on("end", () => reject(new Error(`Missing ${entryName} in archive`)));
    zipfile.readEntry();
  });
}

async function readZipEntryContent(zipPath: string, entryName: string): Promise<string> {
  const buffer = await readZipEntryBuffer(zipPath, entryName);
  return buffer.toString("utf8");
}

async function detectBackupZipEncryption(zipPath: string): Promise<boolean> {
  const entryNames = await listZipEntryNames(zipPath);
  const hasEncrypted = entryNames.includes("database.enc");
  const hasPlain = entryNames.includes("database.json");
  if (!hasEncrypted && !hasPlain) {
    throw new Error("Invalid backup archive: missing database payload");
  }
  return hasEncrypted;
}

export async function extractJsonFromBackupFile(
  filePath: string,
  isEncrypted?: boolean
): Promise<string> {
  const safePath = resolveSafeBackupPath(filePath);
  if (!safePath) {
    throw new Error("Invalid backup file path");
  }

  const encrypted = isEncrypted ?? (await detectBackupZipEncryption(safePath));
  const innerFileName = encrypted ? "database.enc" : "database.json";
  const content = await readZipEntryContent(safePath, innerFileName);
  return encrypted ? decryptBackupPayload(content) : content;
}

export async function extractManifestFromBackupFile(
  filePath: string
): Promise<BackupManifest | null> {
  const safePath = resolveSafeBackupPath(filePath);
  if (!safePath) return null;

  try {
    const entryNames = await listZipEntryNames(safePath);
    if (!entryNames.includes(BACKUP_MANIFEST_FILE)) return null;
    const content = await readZipEntryContent(safePath, BACKUP_MANIFEST_FILE);
    return JSON.parse(content) as BackupManifest;
  } catch {
    return null;
  }
}

export async function restoreSystemFilesFromBackupFile(filePath: string): Promise<number> {
  const safePath = resolveSafeBackupPath(filePath);
  if (!safePath) {
    throw new Error("Invalid backup file path");
  }

  const entryNames = await listZipEntryNames(safePath);
  const fileEntries = entryNames.filter((name) => name.startsWith("files/"));

  let restored = 0;
  for (const entryName of fileEntries) {
    const targetPath = resolveArchivePathToProjectPath(entryName);
    if (!targetPath) continue;

    const buffer = await readZipEntryBuffer(safePath, entryName);
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, buffer);
    restored += 1;
  }

  return restored;
}

export type BackupVerifyResult = {
  valid: boolean;
  tableCount?: number;
  fileCount?: number;
  error?: string;
};

export async function verifyBackupFile(
  filePath: string,
  isEncrypted: boolean
): Promise<BackupVerifyResult> {
  try {
    const json = await extractJsonFromBackupFile(filePath, isEncrypted);
    const payload = JSON.parse(json) as { tables?: Record<string, unknown> };
    if (!payload?.tables || typeof payload.tables !== "object") {
      return { valid: false, error: "Invalid backup structure" };
    }

    const manifest = await extractManifestFromBackupFile(filePath);
    const fileCount = manifest?.totalFiles ?? 1;

    return {
      valid: true,
      tableCount: Object.keys(payload.tables).length,
      fileCount,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Verification failed";
    return { valid: false, error: message };
  }
}

export async function deleteBackupFile(filePath: string | null | undefined) {
  if (!filePath) return;
  const safePath = resolveSafeBackupPath(filePath);
  if (!safePath) return;
  try {
    await fs.unlink(safePath);
  } catch {
    // File may already be removed
  }
}

export async function cleanupExpiredBackups() {
  const cutoff = subDays(new Date(), BACKUP_RETENTION_DAYS);
  const logs = await prisma.backupLog.findMany({
    orderBy: { createdAt: "desc" },
  });

  const idsToDelete = new Set<string>();
  logs.slice(BACKUP_MAX_COUNT).forEach((log) => idsToDelete.add(log.id));
  logs
    .filter((log) => log.createdAt < cutoff)
    .forEach((log) => idsToDelete.add(log.id));

  for (const id of idsToDelete) {
    const log = logs.find((entry) => entry.id === id);
    if (!log) continue;
    await deleteBackupFile(log.filePath);
    await prisma.backupLog.delete({ where: { id } });
  }

  return idsToDelete.size;
}

export async function runDailyAutoBackup(): Promise<AdvancedBackupResult> {
  const useEncryption = Boolean(process.env.BACKUP_SECRET_KEY?.trim());
  const result = await generateAdvancedBackup({
    isEncrypted: useEncryption,
    type: BackupType.AUTO,
  });
  await cleanupExpiredBackups();
  return result;
}
