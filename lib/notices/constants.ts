export const LEGAL_NOTICE_TYPES = [
  "فسخ تعاقد",
  "مطالبات مالية",
  "إنذار بالأداء",
  "إنذار عام",
] as const;

export type LegalNoticeType = (typeof LEGAL_NOTICE_TYPES)[number];
