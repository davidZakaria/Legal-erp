"use server";

import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/auditLogger";
import { hasPermission } from "@/lib/permissions";
import { getUploadDir } from "@/lib/uploads";
import { joinStoredUploadFile } from "@/lib/upload-paths";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function createContract(formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Unauthorized" };
  }

  if (!(await hasPermission(session.user.id, "CONTRACTS_CREATE", session.user.role))) {
    return { success: false, error: "Forbidden" };
  }

  const projectId = (formData.get("projectId") as string)?.trim();
  const contractorName = (formData.get("contractorName") as string)?.trim();
  const totalValueStr = formData.get("totalValue") as string;
  const penaltyClause = (formData.get("penaltyClause") as string)?.trim();
  const guaranteeExpiryStr = formData.get("guaranteeExpiryDate") as string;
  const file = formData.get("file");

  if (!projectId || !contractorName || !totalValueStr || !penaltyClause || !guaranteeExpiryStr) {
    return { success: false, error: "Missing required fields" };
  }

  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "Contract PDF is required" };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { success: false, error: "File exceeds 10MB limit" };
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
  if (!project) {
    return { success: false, error: "Project not found" };
  }

  const uploadDir = getUploadDir();
  const safeName = `${randomUUID()}.pdf`;
  const filePath = joinStoredUploadFile(uploadDir, safeName);

  try {
    await mkdir(uploadDir, { recursive: true });
    await writeFile(filePath, Buffer.from(await file.arrayBuffer()));
  } catch {
    return { success: false, error: "Failed to save contract file" };
  }

  const contract = await prisma.contract.create({
    data: {
      projectId,
      contractorName,
      totalValue,
      penaltyClause,
      guaranteeExpiryDate,
      status: "ACTIVE",
      fileUrl: safeName,
    },
  });

  await logActivity(session.user.id, "CREATE", "Contract", contract.id);

  revalidatePath("/ar/contracts");
  revalidatePath("/en/contracts");

  return { success: true, contractId: contract.id };
}
