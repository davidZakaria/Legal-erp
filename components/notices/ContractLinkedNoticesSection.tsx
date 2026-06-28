"use client";

import { format } from "date-fns";
import { useTranslations } from "next-intl";
import { LegalNoticeDeliveryStatus } from "@prisma/client";
import { LegalNoticeDeliveryBadge } from "@/components/notices/LegalNoticeDeliveryBadge";

export type LinkedNoticeSummary = {
  id: string;
  noticeNumber: string | null;
  year: string;
  noticeType: string;
  opponentName: string;
  submissionDate: string;
  deliveryStatus: LegalNoticeDeliveryStatus;
};

export function ContractLinkedNoticesSection({
  notices,
}: {
  notices: LinkedNoticeSummary[];
}) {
  const t = useTranslations("notices");
  const tContracts = useTranslations("contracts");

  if (notices.length === 0) return null;

  return (
    <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50/50 p-4">
      <p className="text-sm font-semibold text-amber-900">{tContracts("linkedNotices")}</p>
      <ul className="space-y-2">
        {notices.map((notice) => (
          <li
            key={notice.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-100 bg-white px-3 py-2 text-sm"
          >
            <div>
              <span className="font-medium text-foreground">
                {notice.noticeNumber ? `${notice.noticeNumber} / ${notice.year}` : notice.year}
              </span>
              <span className="mx-2 text-slate-400">·</span>
              <span className="text-foreground">{notice.noticeType}</span>
              <span className="mx-2 text-slate-400">·</span>
              <span className="text-muted-foreground">{notice.opponentName}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {format(new Date(notice.submissionDate), "yyyy-MM-dd")}
              </span>
              <LegalNoticeDeliveryBadge status={notice.deliveryStatus} />
            </div>
          </li>
        ))}
      </ul>
      <p className="text-xs text-amber-800">{t("linkedToContractHint")}</p>
    </div>
  );
}
