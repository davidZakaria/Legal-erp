"use server";

import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { AssemblyType } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/auditLogger";
import { isManagerOrAbove } from "@/lib/rbac";
import {
  assemblyArchivePublicUrl,
  getAssemblyUploadDir,
} from "@/lib/gafi-uploads";
import { joinStoredUploadFile } from "@/lib/upload-paths";
import {
  FK_DELETE_ERROR,
  isForeignKeyConstraintError,
  revalidateModulePaths,
  type ActionResult,
} from "@/lib/server-action-utils";

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const VALID_TYPES = Object.values(AssemblyType);

function parseOptionalDate(value: FormDataEntryValue | null): Date | null {
  const raw = (value as string)?.trim();
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function updateSubsidiaryCompany(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };
  if (!isManagerOrAbove(session.user.role)) {
    return { success: false, error: "Forbidden" };
  }

  const existing = await prisma.subsidiaryCompany.findUnique({ where: { id } });
  if (!existing) return { success: false, error: "Company not found" };

  const name = (formData.get("name") as string)?.trim();
  if (!name) return { success: false, error: "Company name is required" };

  await prisma.subsidiaryCompany.update({
    where: { id },
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

  await logActivity(session.user.id, "UPDATE", "SubsidiaryCompany", id);
  revalidateModulePaths("/gafi");
  return { success: true, id };
}

export async function deleteSubsidiaryCompany(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };
  if (!isManagerOrAbove(session.user.role)) {
    return { success: false, error: "Forbidden" };
  }

  try {
    await prisma.subsidiaryCompany.delete({ where: { id } });
    await logActivity(session.user.id, "DELETE", "SubsidiaryCompany", id);
    revalidateModulePaths("/gafi");
    return { success: true };
  } catch (error) {
    if (isForeignKeyConstraintError(error)) {
      return { success: false, error: FK_DELETE_ERROR };
    }
    return { success: false, error: "Delete failed" };
  }
}

export async function updateAssemblyArchive(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };
  if (!isManagerOrAbove(session.user.role)) {
    return { success: false, error: "Forbidden" };
  }

  const existing = await prisma.assemblyArchive.findUnique({ where: { id } });
  if (!existing) return { success: false, error: "Archive not found" };

  const companyId = formData.get("companyId") as string;
  const type = formData.get("type") as AssemblyType;
  const dateHeldRaw = formData.get("dateHeld") as string;
  const file = formData.get("file");

  if (!companyId || !type || !dateHeldRaw) {
    return { success: false, error: "Missing required fields" };
  }
  if (!VALID_TYPES.includes(type)) {
    return { success: false, error: "Invalid assembly type" };
  }

  const dateHeld = new Date(dateHeldRaw);
  if (Number.isNaN(dateHeld.getTime())) {
    return { success: false, error: "Invalid date" };
  }

  const company = await prisma.subsidiaryCompany.findUnique({ where: { id: companyId } });
  if (!company) return { success: false, error: "Company not found" };

  let fileUrl = existing.fileUrl;
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_FILE_SIZE) {
      return { success: false, error: "File exceeds 15MB limit" };
    }
    const uploadDir = getAssemblyUploadDir();
    await mkdir(uploadDir, { recursive: true });
    const ext = path.extname(file.name) || ".pdf";
    const storedName = `${randomUUID()}${ext}`;
    await writeFile(
      joinStoredUploadFile(uploadDir, storedName),
      Buffer.from(await file.arrayBuffer())
    );
    fileUrl = assemblyArchivePublicUrl(storedName);
  }

  await prisma.assemblyArchive.update({
    where: { id },
    data: { companyId, type, dateHeld, fileUrl },
  });

  await logActivity(session.user.id, "UPDATE", "AssemblyArchive", id);
  revalidateModulePaths("/gafi");
  return { success: true, id };
}

export async function deleteAssemblyArchive(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };
  if (!isManagerOrAbove(session.user.role)) {
    return { success: false, error: "Forbidden" };
  }

  try {
    await prisma.assemblyArchive.delete({ where: { id } });
    await logActivity(session.user.id, "DELETE", "AssemblyArchive", id);
    revalidateModulePaths("/gafi");
    return { success: true };
  } catch (error) {
    if (isForeignKeyConstraintError(error)) {
      return { success: false, error: FK_DELETE_ERROR };
    }
    return { success: false, error: "Delete failed" };
  }
}
