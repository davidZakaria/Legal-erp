import { LawsuitStatus } from "@prisma/client";

export const LAWSUIT_STATUS_VALUES = Object.values(LawsuitStatus);

export const SESSION_TYPE_COURT = "COURT" as const;
export const SESSION_TYPE_EXPERT = "EXPERT" as const;
export const SESSION_TYPES = [SESSION_TYPE_COURT, SESSION_TYPE_EXPERT] as const;
export type SessionType = (typeof SESSION_TYPES)[number];

export type LawsuitFilters = {
  q?: string;
  status?: string;
  court?: string;
  year?: string;
};

export type BulkLawsuitRow = {
  caseNumber: string;
  year: number;
  courtName: string;
  opponentName: string;
  assignedLawyerEmail: string;
};

export function getLawsuitStatusLabelAr(status: string): string {
  const labels: Record<string, string> = {
    UNDER_REVIEW: "تحت الفحص والدراسة",
    ACTIVE: "متداولة",
    RESERVED: "محجوزة للحكم",
    COMPLETED: "منتهية",
  };
  return labels[status] ?? status;
}
