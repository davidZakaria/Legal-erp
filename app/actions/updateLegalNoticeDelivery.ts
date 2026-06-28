"use server";

import { LegalNoticeDeliveryStatus } from "@prisma/client";
import { requireAuthenticatedSession } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/auditLogger";
import { hasPermission } from "@/lib/permissions";
import { revalidateModulePaths } from "@/lib/server-action-utils";
import { notifyDeliveryStatusChangeIfNeeded } from "@/lib/notices/notifications";

function parseOptionalDate(raw: FormDataEntryValue | null): Date | null {
  if (!raw || typeof raw !== "string" || !raw.trim()) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

const DELIVERY_STATUSES = new Set<string>(Object.values(LegalNoticeDeliveryStatus));

async function canUpdateNoticeDelivery(userId: string, role: import("@prisma/client").Role, noticeId: string) {
  if (await hasPermission(userId, "NOTICES_UPDATE", role)) {
    return true;
  }

  const notice = await prisma.legalNotice.findUnique({
    where: { id: noticeId },
    select: { assignedLawyerId: true },
  });

  if (!notice || notice.assignedLawyerId !== userId) {
    return false;
  }

  return hasPermission(userId, "NOTICES_READ", role);
}

export async function updateLegalNoticeDelivery(id: string, formData: FormData) {
  const gate = await requireAuthenticatedSession();
  if (!gate.success) {
    return { success: false as const, error: gate.error };
  }
  const session = gate.session;

  if (!(await canUpdateNoticeDelivery(session.user.id, session.user.role, id))) {
    return { success: false as const, error: "Forbidden" };
  }

  const existing = await prisma.legalNotice.findUnique({ where: { id } });
  if (!existing) {
    return { success: false as const, error: "Notice not found" };
  }

  const deliveryStatusRaw = (formData.get("deliveryStatus") as string)?.trim();
  const deliveryDate = parseOptionalDate(formData.get("deliveryDate"));
  const notesAppend = (formData.get("notes") as string)?.trim();
  const notes =
    notesAppend && existing.notes
      ? `${existing.notes}\n${notesAppend}`
      : notesAppend || existing.notes;

  if (!deliveryStatusRaw || !DELIVERY_STATUSES.has(deliveryStatusRaw)) {
    return { success: false as const, error: "Invalid delivery status" };
  }

  const deliveryStatus = deliveryStatusRaw as LegalNoticeDeliveryStatus;

  if (deliveryStatus !== LegalNoticeDeliveryStatus.PENDING && !deliveryDate) {
    return { success: false as const, error: "Delivery date is required when status is not pending" };
  }

  await prisma.legalNotice.update({
    where: { id },
    data: {
      deliveryStatus,
      deliveryDate:
        deliveryStatus === LegalNoticeDeliveryStatus.PENDING ? null : deliveryDate,
      notes,
    },
  });

  notifyDeliveryStatusChangeIfNeeded(
    existing.deliveryStatus,
    deliveryStatus,
    existing.opponentName
  );

  await logActivity(session.user.id, "UPDATE_DELIVERY", "LegalNotice", id);
  revalidateModulePaths("/notices");

  return { success: true as const };
}
