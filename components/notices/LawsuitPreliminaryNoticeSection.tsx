"use client";

import { format } from "date-fns";
import { useTranslations } from "next-intl";
import { FileWarning } from "lucide-react";
import { LegalNoticeDeliveryStatus } from "@prisma/client";
import { LegalNoticeDeliveryBadge } from "@/components/notices/LegalNoticeDeliveryBadge";

export type PreliminaryNoticeSummary = {
  id: string;
  noticeNumber: string | null;
  year: string;
  noticeType: string;
  bailiffOffice: string;
  opponentName: string;
  submissionDate: string;
  deliveryStatus: LegalNoticeDeliveryStatus;
  deliveryDate: string | null;
};

export function LawsuitPreliminaryNoticeSection({
  notice,
}: {
  notice: PreliminaryNoticeSummary | null;
}) {
  const t = useTranslations("notices");

  if (!notice) return null;

  return (
    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/60 p-3">
      <div className="flex items-start gap-2">
        <FileWarning className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
        <div className="min-w-0 flex-1 space-y-1 text-sm">
          <p className="font-semibold text-amber-900">{t("preliminaryNotice")}</p>
          <p className="text-foreground">
            {notice.noticeNumber ? `${notice.noticeNumber} / ${notice.year}` : notice.year}
            <span className="mx-2 text-slate-400">·</span>
            {notice.noticeType}
          </p>
          <p className="text-muted-foreground">
            {t("bailiffOffice")}: {notice.bailiffOffice}
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <LegalNoticeDeliveryBadge status={notice.deliveryStatus} />
            <span className="text-xs text-muted-foreground">
              {t("submissionDate")}: {format(new Date(notice.submissionDate), "yyyy-MM-dd")}
            </span>
            {notice.deliveryDate && (
              <span className="text-xs text-muted-foreground">
                {t("deliveryDate")}: {format(new Date(notice.deliveryDate), "yyyy-MM-dd")}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
