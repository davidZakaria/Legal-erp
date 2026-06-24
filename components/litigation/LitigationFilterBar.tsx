"use client";

import { useCallback, useTransition } from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LAWSUIT_STATUS_VALUES } from "@/lib/litigation/constants";
import type { LawsuitFilters } from "@/lib/litigation/constants";
import { ExportFilteredLawsuitsButton } from "./ExportFilteredLawsuitsButton";
import type { LawsuitExportRow } from "@/lib/litigation/exportLawsuits";

const ALL = "__all__";

export function LitigationFilterBar({
  filters,
  courts,
  years,
  exportRows,
}: {
  filters: LawsuitFilters;
  courts: string[];
  years: number[];
  exportRows: LawsuitExportRow[];
}) {
  const t = useTranslations("litigation");
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const applyFilters = useCallback(
    (next: LawsuitFilters) => {
      const params = new URLSearchParams();
      if (next.q?.trim()) params.set("q", next.q.trim());
      if (next.status) params.set("status", next.status);
      if (next.court) params.set("court", next.court);
      if (next.year) params.set("year", next.year);

      const query = params.toString();
      startTransition(() => {
        router.push(query ? `${pathname}?${query}` : pathname);
      });
    },
    [pathname, router]
  );

  const clearFilters = () => applyFilters({});

  const hasActiveFilters = Boolean(
    filters.q || filters.status || filters.court || filters.year
  );

  return (
    <div className="mb-6 space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1 space-y-1">
          <label className="text-xs font-medium text-slate-600">{t("filterSearch")}</label>
          <div className="relative">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="ps-9"
              placeholder={t("filterSearchPlaceholder")}
              defaultValue={filters.q ?? ""}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  applyFilters({ ...filters, q: e.currentTarget.value });
                }
              }}
              onBlur={(e) => {
                if (e.target.value !== (filters.q ?? "")) {
                  applyFilters({ ...filters, q: e.target.value });
                }
              }}
            />
          </div>
        </div>

        <div className="w-full space-y-1 sm:w-44">
          <label className="text-xs font-medium text-slate-600">{t("overallStatus")}</label>
          <Select
            value={filters.status ?? ALL}
            onValueChange={(value) =>
              applyFilters({
                ...filters,
                status: value === ALL ? undefined : value,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder={t("filterAllStatuses")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("filterAllStatuses")}</SelectItem>
              {LAWSUIT_STATUS_VALUES.map((status) => (
                <SelectItem key={status} value={status}>
                  {t(`status_${status}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full space-y-1 sm:w-48">
          <label className="text-xs font-medium text-slate-600">{t("court")}</label>
          <Select
            value={filters.court ?? ALL}
            onValueChange={(value) =>
              applyFilters({
                ...filters,
                court: value === ALL ? undefined : value,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder={t("filterAllCourts")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("filterAllCourts")}</SelectItem>
              {courts.map((court) => (
                <SelectItem key={court} value={court}>
                  {court}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full space-y-1 sm:w-32">
          <label className="text-xs font-medium text-slate-600">{t("year")}</label>
          <Select
            value={filters.year ?? ALL}
            onValueChange={(value) =>
              applyFilters({
                ...filters,
                year: value === ALL ? undefined : value,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder={t("filterAllYears")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("filterAllYears")}</SelectItem>
              {years.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="gap-1" onClick={clearFilters}>
            <X className="h-4 w-4" />
            {t("clearFilters")}
          </Button>
        )}
        {isPending && (
          <span className="text-xs text-muted-foreground">{t("filterApplying")}</span>
        )}
        <div className="ms-auto">
          <ExportFilteredLawsuitsButton lawsuits={exportRows} />
        </div>
      </div>
    </div>
  );
}
