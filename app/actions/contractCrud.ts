"use server";

import { randomUUID } from "crypto";
import { mkdir, writeFile, unlink } from "fs/promises";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/auditLogger";
import { isManagerOrAbove } from "@/lib/rbac";
import { getUploadDir } from "@/lib/uploads";
import { joinStoredUploadFile } from "@/lib/upload-paths";
import {
  FK_DELETE_ERROR,
  isForeignKeyConstraintError,
  revalidateModulePaths,
  type ActionResult,
} from "@/lib/server-action-utils";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function updateContract(id: string, formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };
  if (!isManagerOrAbove(session.user.role)) {
    return { success: false, error: "Forbidden" };
  }

  const existing = await prisma.contract.findUnique({ where: { id } });
  if (!existing) return { success: false, error: "Contract not found" };

  const projectId = (formData.get("projectId") as string)?.trim();
  const contractorName = (formData.get("contractorName") as string)?.trim();
  const totalValueStr = formData.get("totalValue") as string;
  const penaltyClause = (formData.get("penaltyClause") as string)?.trim();
  const guaranteeExpiryStr = formData.get("guaranteeExpiryDate") as string;
  const status = (formData.get("status") as string)?.trim() || existing.status;
  const file = formData.get("file");

  if (!projectId || !contractorName || !totalValueStr || !penaltyClause || !guaranteeExpiryStr) {
    return { success: false, error: "Missing required fields" };
  }

  const totalValue = Number(totalValueStr);
  if (!Number.isFinite(totalValue) || totalValue <= 0) {
    return { success: false, error: "Invalid total value" };
  }

  const guaranteeExpiryDate = new Date(guaranteeExpiryStr);
  if (isNaN(guaranteeExpiryDate.getTime())) {
    return { success: false, error: "Invalid guarantee expiry date" };
  }

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return { success: false, error: "Project not found" };

  let fileUrl = existing.fileUrl;
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_FILE_SIZE) {
      return { success: false, error: "File exceeds 10MB limit" };
    }
    const uploadDir = getUploadDir();
    const safeName = `${randomUUID()}.pdf`;
    await mkdir(uploadDir, { recursive: true });
    await writeFile(joinStoredUploadFile(uploadDir, safeName), Buffer.from(await file.arrayBuffer()));
    try {
      await unlink(joinStoredUploadFile(uploadDir, existing.fileUrl));
    } catch {
      /* old file may not exist */
    }
    fileUrl = safeName;
  }

  await prisma.contract.update({
    where: { id },
    data: {
      projectId,
      contractorName,
      totalValue,
      penaltyClause,
      guaranteeExpiryDate,
      status,
      fileUrl,
    },
  });

  await logActivity(session.user.id, "UPDATE", "Contract", id);
  revalidateModulePaths("/contracts");
  return { success: true, id };
}

export async function deleteContract(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };
  if (!isManagerOrAbove(session.user.role)) {
    return { success: false, error: "Forbidden" };
  }

  try {
    const existing = await prisma.contract.findUnique({ where: { id } });
    if (!existing) return { success: false, error: "Contract not found" };

    await prisma.contract.delete({ where: { id } });
    await logActivity(session.user.id, "DELETE", "Contract", id);
    revalidateModulePaths("/contracts");
    return { success: true };
  } catch (error) {
    if (isForeignKeyConstraintError(error)) {
      return { success: false, error: FK_DELETE_ERROR };
    }
    return { success: false, error: "Delete failed" };
  }
}
