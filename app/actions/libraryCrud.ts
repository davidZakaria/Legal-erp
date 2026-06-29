"use server";

import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { LegalDocumentCategory } from "@prisma/client";
import { requirePermission } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/auditLogger";
import { libraryDocumentPublicUrl } from "@/lib/library-uploads";
import {
  getLibraryUploadDir,
  joinStoredUploadFile,
} from "@/lib/upload-paths";
import {
  revalidateModulePaths,
  type ActionResult,
} from "@/lib/server-action-utils";

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const VALID_CATEGORIES = Object.values(LegalDocumentCategory);

export async function updateLegalDocument(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const gate = await requirePermission("LIBRARY_UPDATE");
  if (!gate.success) return { success: false, error: gate.error };
  const session = gate.session;

  const existing = await prisma.legalDocument.findUnique({ where: { id } });
  if (!existing) return { success: false, error: "Document not found" };

  const title = (formData.get("title") as string)?.trim();
  const category = formData.get("category") as LegalDocumentCategory;
  const file = formData.get("file");

  if (!title || !category) {
    return { success: false, error: "Missing required fields" };
  }

  if (!VALID_CATEGORIES.includes(category)) {
    return { success: false, error: "Invalid category" };
  }

  let fileUrl = existing.fileUrl;
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_FILE_SIZE) {
      return { success: false, error: "File exceeds 15MB limit" };
    }
    const uploadDir = getLibraryUploadDir();
    await mkdir(uploadDir, { recursive: true });
    const ext = path.extname(file.name) || ".pdf";
    const storedName = `${randomUUID()}${ext}`;
    await writeFile(
      joinStoredUploadFile(uploadDir, storedName),
      Buffer.from(await file.arrayBuffer())
    );
    fileUrl = libraryDocumentPublicUrl(storedName);
  }

  await prisma.legalDocument.update({
    where: { id },
    data: { title, category, fileUrl },
  });

  await logActivity(session.user.id, "UPDATE", "LegalDocument", id);
  revalidateModulePaths("/library");
  return { success: true, id };
}

export async function deleteLegalDocument(id: string): Promise<ActionResult> {
  const gate = await requirePermission("LIBRARY_DELETE");
  if (!gate.success) return { success: false, error: gate.error };
  const session = gate.session;

  const existing = await prisma.legalDocument.findUnique({ where: { id } });
  if (!existing) return { success: false, error: "Document not found" };

  await prisma.legalDocument.delete({ where: { id } });
  await logActivity(session.user.id, "DELETE", "LegalDocument", id);
  revalidateModulePaths("/library");
  return { success: true };
}
