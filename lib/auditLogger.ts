import { prisma } from "@/lib/prisma";

export async function logActivity(
  userId: string,
  action: string,
  entityName: string,
  entityId: string
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      entityName,
      entityId,
    },
  });
}
