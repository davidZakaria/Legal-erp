import { Prisma, LawsuitStatus } from "@prisma/client";
import type { LawsuitFilters } from "@/lib/litigation/constants";
import { LAWSUIT_STATUS_VALUES } from "@/lib/litigation/constants";

export function buildLawsuitWhere(filters: LawsuitFilters): Prisma.LawsuitWhereInput {
  const where: Prisma.LawsuitWhereInput = {};
  const q = filters.q?.trim();

  if (q) {
    where.OR = [
      { caseNumber: { contains: q, mode: "insensitive" } },
      { opponentName: { contains: q, mode: "insensitive" } },
    ];
  }

  if (
    filters.status &&
    LAWSUIT_STATUS_VALUES.includes(filters.status as LawsuitStatus)
  ) {
    where.overallStatus = filters.status as LawsuitStatus;
  }

  if (filters.court) {
    where.courtName = filters.court;
  }

  if (filters.year) {
    const year = parseInt(filters.year, 10);
    if (!Number.isNaN(year)) {
      where.year = year;
    }
  }

  return where;
}
