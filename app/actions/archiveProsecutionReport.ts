"use server";

import { revalidatePath } from "next/cache";
import { ProsecutionStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/auditLogger";
import { isManagerOrAbove } from "@/lib/rbac";

export async function archiveProsecutionReport(prosecutionId: string) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Unauthorized" };
  }

  if (!isManagerOrAbove(session.user.role)) {
    return { success: false, error: "Forbidden" };
  }

  const existing = await prisma.prosecution.findUnique({ where: { id: prosecutionId } });
  if (!existing) {
    return { success: false, error: "Prosecution not found" };
  }

  if (existing.status === ProsecutionStatus.ARCHIVED_SAVED) {
    return { success: false, error: "Already archived" };
  }

  await prisma.prosecution.update({
    where: { id: prosecutionId },
    data: { status: ProsecutionStatus.ARCHIVED_SAVED },
  });

  await logActivity(session.user.id, "ARCHIVE_REPORT", "Prosecution", prosecutionId);

  revalidatePath("/ar/prosecutions");
  revalidatePath("/en/prosecutions");

  return { success: true };
}
