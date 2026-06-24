import { LawsuitStatus } from "@prisma/client";

export const LAWSUIT_STATUS_VALUES = Object.values(LawsuitStatus);

export type LawsuitFilters = {
  q?: string;
  status?: string;
  court?: string;
  year?: string;
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
