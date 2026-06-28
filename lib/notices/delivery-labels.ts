import { LegalNoticeDeliveryStatus } from "@prisma/client";

export const DELIVERY_STATUS_LABELS_AR: Record<LegalNoticeDeliveryStatus, string> = {
  PENDING: "جاري الإعلان بالمحضرين",
  DELIVERED_SUCCESS: "إعلان قانوني صحيح",
  DELIVERED_REFUSED: "إعلان بالرفض/إداري",
  NOT_FOUND: "لم يستدل على العنوان",
};

export function getDeliveryStatusLabelAr(status: LegalNoticeDeliveryStatus): string {
  return DELIVERY_STATUS_LABELS_AR[status] ?? status;
}

export function formatNoticeDateAr(date: Date | null | undefined): string {
  if (!date) return "—";
  return date.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
