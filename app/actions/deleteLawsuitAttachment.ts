"use server";

import { unlink } from "fs/promises";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/auditLogger";
import { isManagerOrAbove } from "@/lib/rbac";
import { resolveLawsuitAttachmentPath } from "@/lib/lawsuit-uploads";

export async function deleteLawsuitAttachment(attachmentId: string, lawsuitId: string) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Unauthorized" };
  }

  if (!isManagerOrAbove(session.user.role)) {
    return { success: false, error: "Forbidden" };
  }

  const attachment = await prisma.lawsuitAttachment.findFirst({
    where: { id: attachmentId, lawsuitId },
  });

  if (!attachment) {
    return { success: false, error: "Attachment not found" };
  }

  try {
    const diskPath = await resolveLawsuitAttachmentPath(attachment.fileUrl);
    await unlink(diskPath);
  } catch {
    // File may already be missing on disk; continue with DB delete
  }

  await prisma.lawsuitAttachment.delete({ where: { id: attachmentId } });
  await logActivity(session.user.id, "DELETE_ATTACHMENT", "Lawsuit", lawsuitId);

  revalidatePath("/ar/litigation");
  revalidatePath("/en/litigation");

  return { success: true };
}
