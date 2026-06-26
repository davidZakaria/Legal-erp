"use client";

import { useTranslations } from "next-intl";
import { format, differenceInDays, startOfDay } from "date-fns";
import { AlertCircle, Radar } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CreateSubsidiaryDialog } from "./CreateSubsidiaryDialog";

export type SubsidiaryCompanyRow = {
  id: string;
  name: string;
  commercialRegister: string | null;
  crExpiryDate: string | null;
  taxCard: string | null;
  taxCardExpiryDate: string | null;
  boardExpiryDate: string | null;
  capitalPaidDetails: string | null;
};

function isExpiryUrgent(date: Date | null): boolean {
  if (!date) return false;
  const daysUntil = differenceInDays(startOfDay(date), startOfDay(new Date()));
  return daysUntil >= 0 && daysUntil <= 60;
}

function ExpiryCell({ dateIso }: { dateIso: string | null }) {
  if (!dateIso) return <span className="text-slate-400">—</span>;

  const date = new Date(dateIso);
  const urgent = isExpiryUrgent(date);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2",
        urgent && "font-bold text-red-600"
      )}
    >
      {format(date, "yyyy-MM-dd")}
      {urgent && (
        <AlertCircle className="inline h-4 w-4 animate-pulse text-red-600" />
      )}
    </span>
  );
}

export function SubsidiaryRegistryTable({
  companies,
  canManage,
}: {
  companies: SubsidiaryCompanyRow[];
  canManage: boolean;
}) {
  const t = useTranslations("gafi");
  const tCommon = useTranslations("common");

  const urgentCount = companies.filter((company) => {
    const dates = [
      company.crExpiryDate ? new Date(company.crExpiryDate) : null,
      company.taxCardExpiryDate ? new Date(company.taxCardExpiryDate) : null,
      company.boardExpiryDate ? new Date(company.boardExpiryDate) : null,
    ];
    return dates.some((date) => isExpiryUrgent(date));
  }).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {urgentCount > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            <Radar className="h-4 w-4" />
            <span>{t("registryRadarAlert", { count: urgentCount })}</span>
          </div>
        )}
        {canManage && <CreateSubsidiaryDialog canCreate={canManage} />}
      </div>

      <Card className="overflow-hidden border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-white py-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <Radar className="h-4 w-4 text-red-600" />
            {t("registryRadar")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                <TableHead>{t("companyName")}</TableHead>
                <TableHead>{t("commercialRegister")}</TableHead>
                <TableHead>{t("crExpiryDate")}</TableHead>
                <TableHead>{t("taxCard")}</TableHead>
                <TableHead>{t("taxCardExpiryDate")}</TableHead>
                <TableHead>{t("boardExpiryDate")}</TableHead>
                <TableHead>{t("capitalPaidDetails")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.length ? (
                companies.map((company) => (
                  <TableRow key={company.id} className="bg-white">
                    <TableCell className="font-medium text-slate-900">{company.name}</TableCell>
                    <TableCell>{company.commercialRegister ?? "—"}</TableCell>
                    <TableCell>
                      <ExpiryCell dateIso={company.crExpiryDate} />
                    </TableCell>
                    <TableCell>{company.taxCard ?? "—"}</TableCell>
                    <TableCell>
                      <ExpiryCell dateIso={company.taxCardExpiryDate} />
                    </TableCell>
                    <TableCell>
                      <ExpiryCell dateIso={company.boardExpiryDate} />
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {company.capitalPaidDetails ?? "—"}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-slate-500">
                    {tCommon("noData")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
