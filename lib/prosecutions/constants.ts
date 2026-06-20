export const PROSECUTION_ISSUE_TYPES = [
  "شيك بدون رصيد",
  "إيصال أمانة",
  "مخالفة مباني",
  "تعدي على أرض",
] as const;

export const BOUNCED_CHECK_ISSUE_TYPE = "شيك بدون رصيد";

export const PROSECUTION_STATUSES = [
  "POLICE_REPORT",
  "IN_COURT",
  "RECONCILED",
] as const;

export type ProsecutionStatus = (typeof PROSECUTION_STATUSES)[number];
