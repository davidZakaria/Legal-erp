import fs from "fs/promises";
import path from "path";
import {
  getAssemblyUploadDir,
  getContractUploadDir,
  getExpenseReceiptUploadDir,
  getLibraryUploadDir,
  getLawsuitUploadDir,
} from "@/lib/upload-paths";

export type BackupFileCategory =
  | "database"
  | "contracts"
  | "library"
  | "lawsuits"
  | "expenses"
  | "assemblies";

export type BackupManifestFile = {
  archivePath: string;
  size: number;
  category: BackupFileCategory;
};

export type BackupCategorySummary = {
  category: BackupFileCategory;
  label: string;
  fileCount: number;
  totalBytes: number;
  sampleFiles: string[];
};

export type BackupManifest = {
  version: 2;
  exportedAt: string;
  databaseTables: number;
  totalFiles: number;
  totalBytes: number;
  categories: BackupCategorySummary[];
  files: BackupManifestFile[];
};

export type BackupManifestPreview = {
  databaseTables: number;
  totalFiles: number;
  totalBytes: number;
  categories: BackupCategorySummary[];
};

const CATEGORY_LABELS: Record<BackupFileCategory, { en: string; ar: string }> = {
  database: { en: "Database", ar: "قاعدة البيانات" },
  contracts: { en: "Contract files", ar: "ملفات العقود" },
  library: { en: "Legal library", ar: "المكتبة القانونية" },
  lawsuits: { en: "Lawsuit attachments", ar: "مرفقات القضايا" },
  expenses: { en: "Expense receipts", ar: "إيصالات المصروفات" },
  assemblies: { en: "Assembly minutes", ar: "محاضر الجمعيات" },
};

const SYSTEM_FILE_ROOTS: Array<{
  category: BackupFileCategory;
  resolveDir: () => string;
  archivePrefix: string;
}> = [
  {
    category: "contracts",
    resolveDir: getContractUploadDir,
    archivePrefix: "files/uploads/contracts",
  },
  {
    category: "library",
    resolveDir: getLibraryUploadDir,
    archivePrefix: "files/public/uploads/library",
  },
  {
    category: "lawsuits",
    resolveDir: getLawsuitUploadDir,
    archivePrefix: "files/public/uploads/lawsuits",
  },
  {
    category: "expenses",
    resolveDir: getExpenseReceiptUploadDir,
    archivePrefix: "files/public/uploads/expenses",
  },
  {
    category: "assemblies",
    resolveDir: getAssemblyUploadDir,
    archivePrefix: "files/public/uploads/assemblies",
  },
];

async function walkDirectory(
  absoluteDir: string,
  archivePrefix: string,
  category: BackupFileCategory
): Promise<BackupManifestFile[]> {
  const entries: BackupManifestFile[] = [];

  async function walk(currentDir: string, relativePrefix: string) {
    let dirEntries;
    try {
      dirEntries = await fs.readdir(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of dirEntries) {
      const absolutePath = path.join(currentDir, entry.name);
      const relativePath = relativePrefix
        ? path.posix.join(relativePrefix, entry.name)
        : entry.name;

      if (entry.isDirectory()) {
        await walk(absolutePath, relativePath);
        continue;
      }

      if (!entry.isFile()) continue;

      const stats = await fs.stat(absolutePath);
      entries.push({
        archivePath: path.posix.join(archivePrefix, relativePath),
        size: stats.size,
        category,
      });
    }
  }

  await walk(absoluteDir, "");
  return entries;
}

export async function collectSystemFiles(): Promise<BackupManifestFile[]> {
  const collected: BackupManifestFile[] = [];

  for (const root of SYSTEM_FILE_ROOTS) {
    const absoluteDir = root.resolveDir();
    const files = await walkDirectory(absoluteDir, root.archivePrefix, root.category);
    collected.push(...files);
  }

  return collected.sort((a, b) => a.archivePath.localeCompare(b.archivePath));
}

export function summarizeManifestFiles(
  files: BackupManifestFile[],
  databaseTables: number
): BackupManifest {
  const categories = new Map<BackupFileCategory, BackupCategorySummary>();

  for (const file of files) {
    const existing = categories.get(file.category) ?? {
      category: file.category,
      label: CATEGORY_LABELS[file.category].en,
      fileCount: 0,
      totalBytes: 0,
      sampleFiles: [],
    };

    existing.fileCount += 1;
    existing.totalBytes += file.size;
    if (existing.sampleFiles.length < 8) {
      existing.sampleFiles.push(path.basename(file.archivePath));
    }
    categories.set(file.category, existing);
  }

  const databaseSummary: BackupCategorySummary = {
    category: "database",
    label: CATEGORY_LABELS.database.en,
    fileCount: 1,
    totalBytes: 0,
    sampleFiles: ["database.json"],
  };

  const categoryList = [databaseSummary, ...Array.from(categories.values())];
  const totalFiles = files.length + 1;
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);

  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    databaseTables,
    totalFiles,
    totalBytes,
    categories: categoryList,
    files,
  };
}

export function toManifestPreview(manifest: BackupManifest): BackupManifestPreview {
  return {
    databaseTables: manifest.databaseTables,
    totalFiles: manifest.totalFiles,
    totalBytes: manifest.totalBytes,
    categories: manifest.categories,
  };
}

export function resolveArchivePathToProjectPath(archivePath: string): string | null {
  const normalized = archivePath.replace(/\\/g, "/");
  if (!normalized.startsWith("files/")) return null;

  const relative = normalized.slice("files/".length);
  if (relative.includes("..")) return null;

  return path.join(process.cwd(), relative);
}

export const BACKUP_MANIFEST_FILE = "manifest.json";
