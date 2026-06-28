"use client";

import { LegalNoticeDeliveryStatus } from "@prisma/client";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DELIVERY_STATUS_LABELS_AR } from "@/lib/notices/delivery-labels";

const STATUS_STYLES: Record<LegalNoticeDeliveryStatus, string> = {
  PENDING: "border-0 bg-yellow-400 text-yellow-950 hover:bg-yellow-400",
  DELIVERED_SUCCESS: "border-0 bg-green-500 text-white hover:bg-green-500",
  DELIVERED_REFUSED: "border-0 bg-orange-500 text-white hover:bg-orange-500",
  NOT_FOUND: "border-0 bg-red-500 text-white hover:bg-red-500",
};

export function LegalNoticeDeliveryBadge({
  status,
  className,
}: {
  status: LegalNoticeDeliveryStatus;
  className?: string;
}) {
  const locale = useLocale();
  const t = useTranslations("notices");
  const label =
    locale === "ar" ? DELIVERY_STATUS_LABELS_AR[status] : t(`deliveryStatus_${status}`);

  return <Badge className={cn(STATUS_STYLES[status], className)}>{label}</Badge>;
}
