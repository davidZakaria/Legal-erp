"use server";

import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { AssemblyType } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/auditLogger";
import { hasPermission } from "@/lib/permissions";
import {
  assemblyArchivePublicUrl,
  getAssemblyUploadDir,
} from "@/lib/gafi-uploads";
import { joinStoredUploadFile } from "@/lib/upload-paths";

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const VALID_TYPES = Object.values(AssemblyType);

export async function createAssemblyArchive(formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Unauthorized" };
  }

  if (!(await hasPermission(session.user.id, "GAFI_CREATE", session.user.role))) {
    return { success: false, error: "Forbidden" };
  }

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
  if (!company) {
    return { success: false, error: "Company not found" };
  }

  let fileUrl: string | null = null;

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

  const archive = await prisma.assemblyArchive.create({
    data: {
      companyId,
      type,
      dateHeld,
      fileUrl,
    },
  });

  await logActivity(session.user.id, "CREATE", "AssemblyArchive", archive.id);

  revalidatePath("/ar/gafi");
  revalidatePath("/en/gafi");

  return { success: true, archiveId: archive.id };
}
