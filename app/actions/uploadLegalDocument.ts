"use server";

import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireAuthenticatedSession } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/auditLogger";
import { canUploadLibraryDocuments } from "@/lib/rbac";
import { LegalDocumentCategory } from "@prisma/client";
import {
  getLibraryUploadDir,
  joinStoredUploadFile,
} from "@/lib/upload-paths";
import { libraryDocumentPublicUrl } from "@/lib/library-uploads";

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const VALID_CATEGORIES = Object.values(LegalDocumentCategory);

export async function uploadLegalDocument(formData: FormData) {
  const gate = await requireAuthenticatedSession();
  if (!gate.success) {
    return { success: false, error: gate.error };
  }
  const session = gate.session;

  if (!canUploadLibraryDocuments(session.user.role)) {
    return { success: false, error: "Forbidden" };
  }

  const title = (formData.get("title") as string)?.trim();
  const category = formData.get("category") as LegalDocumentCategory;
  const file = formData.get("file");

  if (!title || !category) {
    return { success: false, error: "Missing required fields" };
  }

  if (!VALID_CATEGORIES.includes(category)) {
    return { success: false, error: "Invalid category" };
  }

  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "File is required" };
  }

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

  const document = await prisma.legalDocument.create({
    data: {
      title,
      category,
      fileUrl: libraryDocumentPublicUrl(storedName),
      uploadedById: session.user.id,
    },
  });

  await logActivity(session.user.id, "UPLOAD", "LegalDocument", document.id);
  revalidatePath("/ar/library");
  revalidatePath("/en/library");

  return { success: true, documentId: document.id };
}
