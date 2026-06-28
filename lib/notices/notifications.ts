import { LegalNoticeDeliveryStatus } from "@prisma/client";
import {
  notifyLegalNoticeAssignmentNonBlocking,
  notifyNoticeDeliveryChangeIfNeeded,
} from "@/lib/notifications/assignment-matrix";

export { notifyLegalNoticeAssignmentNonBlocking as notifyNoticeAssignmentNonBlocking };

export function notifyDeliveryStatusChangeIfNeeded(
  previousStatus: LegalNoticeDeliveryStatus,
  newStatus: LegalNoticeDeliveryStatus,
  opponentName: string,
  _deliveryDate?: Date | null
): void {
  notifyNoticeDeliveryChangeIfNeeded(previousStatus, newStatus, opponentName);
}
