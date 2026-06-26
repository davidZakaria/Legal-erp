"use client";

import { Fragment, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";
import { format, differenceInDays, startOfDay } from "date-fns";
import { addDays, isBefore } from "date-fns";
import {
  AlertTriangle,
  ChevronDown,
  Download,
  FileText,
  MapPin,
  Radar,
  Scale,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LegalBadge } from "@/lib/legal-labels";
import { RecordActions } from "@/components/crud/RecordActions";
import { cn } from "@/lib/utils";

export type ContractRow = {
  id: string;
  projectId: string;
  contractorName: string;
  projectName: string;
  projectLocation: string;
  totalValue: string;
  guaranteeExpiryDate: string;
  penaltyClause: string;
  status: string;
  createdAt: string;
};

const columnHelper = createColumnHelper<ContractRow>();

function isExpiringSoon(dateStr: string): boolean {
  const expiry = new Date(dateStr);
  const threshold = addDays(new Date(), 30);
  return isBefore(expiry, threshold);
}

function formatCurrency(value: string, locale: string): string {
  return Number(value).toLocaleString(locale === "ar" ? "ar-EG" : "en-EG");
}

function ContractExpandedDetails({
  contract,
  locale,
}: {
  contract: ContractRow;
  locale: string;
}) {
  const t = useTranslations("contracts");
  const tDash = useTranslations("dashboard");

  const expiry = new Date(contract.guaranteeExpiryDate);
  const daysUntilExpiry = differenceInDays(startOfDay(expiry), startOfDay(new Date()));
  const expiring = isExpiringSoon(contract.guaranteeExpiryDate);

  return (
    <div className="grid gap-4 border-t border-slate-100 bg-slate-50/80 px-4 py-4 sm:grid-cols-2 lg:grid-cols-3">
      <div className="space-y-1 sm:col-span-2 lg:col-span-3">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <Scale className="h-3.5 w-3.5" />
          {t("penaltyClause")}
        </p>
        <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-relaxed text-slate-800">
          {contract.penaltyClause}
        </p>
      </div>

      <div className="space-y-1">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <MapPin className="h-3.5 w-3.5" />
          {t("projectLocation")}
        </p>
        <p className="text-sm font-medium text-slate-900">{contract.projectLocation}</p>
      </div>

      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t("registeredDate")}
        </p>
        <p className="text-sm font-medium text-slate-900">
          {format(new Date(contract.createdAt), "yyyy-MM-dd")}
        </p>
      </div>

      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t("daysUntilExpiry")}
        </p>
        <p
          className={cn(
            "text-sm font-semibold",
            expiring ? "text-destructive" : "text-slate-900"
          )}
        >
          {daysUntilExpiry < 0
            ? t("expiredDaysAgo", { days: Math.abs(daysUntilExpiry) })
            : daysUntilExpiry === 0
              ? t("expiresToday")
              : t("daysRemaining", { days: daysUntilExpiry })}
        </p>
      </div>

      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t("totalValue")}
        </p>
        <p className="text-sm font-semibold text-slate-900">
          {formatCurrency(contract.totalValue, locale)} {tDash("egp")}
        </p>
      </div>

      <div className="flex items-end sm:col-span-2 lg:col-span-1">
        <Button variant="outline" size="sm" className="gap-2" asChild>
          <a href={`/api/contracts/${contract.id}/download`}>
            <FileText className="h-4 w-4" />
            {t("downloadContractPdf")}
          </a>
        </Button>
      </div>
    </div>
  );
}

export function ContractsDataTable({
  data,
  canUpdate = false,
  canDelete = false,
  onEdit,
  onDelete,
  deleteSuccessMessage,
  deleteErrorMessage,
}: {
  data: ContractRow[];
  canUpdate?: boolean;
  canDelete?: boolean;
  onEdit?: (row: ContractRow) => void;
  onDelete?: (id: string) => Promise<{ success: boolean; error?: string }>;
  deleteSuccessMessage?: string;
  deleteErrorMessage?: string;
}) {
  const t = useTranslations("contracts");
  const tCommon = useTranslations("common");
  const tDash = useTranslations("dashboard");
  const locale = useLocale();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const columns = [
    columnHelper.display({
      id: "expand",
      header: () => null,
      cell: (info) => {
        const expanded = expandedIds.has(info.row.original.id);
        return (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-500"
            aria-expanded={expanded}
            aria-label={expanded ? t("collapseDetails") : t("expandDetails")}
            onClick={(event) => {
              event.stopPropagation();
              toggleExpanded(info.row.original.id);
            }}
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                expanded && "rotate-180"
              )}
            />
          </Button>
        );
      },
    }),
    columnHelper.accessor("contractorName", {
      header: () => t("contractor"),
      cell: (info) => <span className="font-medium text-slate-900">{info.getValue()}</span>,
    }),
    columnHelper.accessor("projectName", {
      header: () => t("project"),
      cell: (info) => (
        <span className="text-slate-700">
          {info.getValue()} <span className="text-slate-400">({info.row.original.projectLocation})</span>
        </span>
      ),
    }),
    columnHelper.accessor("totalValue", {
      header: () => t("totalValue"),
      cell: (info) => (
        <span className="font-semibold text-slate-900">
          {formatCurrency(info.getValue(), locale)} {tDash("egp")}
        </span>
      ),
    }),
    columnHelper.accessor("guaranteeExpiryDate", {
      header: () => t("guaranteeExpiry"),
      cell: (info) => {
        const expiring = isExpiringSoon(info.getValue());
        return (
          <div className="flex items-center gap-2">
            <span className={cn(expiring && "font-medium text-destructive")}>
              {format(new Date(info.getValue()), "yyyy-MM-dd")}
            </span>
            {expiring && (
              <Badge
                variant="destructive"
                className="animate-pulse gap-1"
              >
                <AlertTriangle className="h-3 w-3" />
                {tCommon("expiringSoon")}
              </Badge>
            )}
          </div>
        );
      },
    }),
    columnHelper.accessor("status", {
      header: () => tCommon("status"),
      cell: (info) => (
        <LegalBadge category="contractStatus" value={info.getValue()} locale={locale} />
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: () => tCommon("actions"),
      cell: (info) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="outline" size="sm" className="gap-2" asChild>
            <a href={`/api/contracts/${info.row.original.id}/download`}>
              <Download className="h-4 w-4" />
              {tCommon("download")}
            </a>
          </Button>
          {(canUpdate || canDelete) && (
            <RecordActions
              showEdit={canUpdate}
              showDelete={canDelete}
              onEdit={onEdit ? () => onEdit(info.row.original) : undefined}
              onDelete={onDelete ? () => onDelete(info.row.original.id) : undefined}
              deleteItemName={info.row.original.contractorName}
              deleteSuccessMessage={deleteSuccessMessage}
              deleteErrorMessage={deleteErrorMessage}
            />
          )}
        </div>
      ),
    }),
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="border-b border-slate-100 bg-white">
        <CardTitle className="flex items-center gap-2 text-base text-slate-700">
          <Radar className="h-4 w-4 text-destructive" />
          {t("guaranteeRadar")}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-slate-50/80 hover:bg-slate-50/80">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => {
                const expiring = isExpiringSoon(row.original.guaranteeExpiryDate);
                const expanded = expandedIds.has(row.original.id);

                return (
                  <Fragment key={row.id}>
                    <TableRow
                      className={cn(
                        "cursor-pointer bg-white",
                        expiring && "bg-destructive/5 hover:bg-destructive/10",
                        expanded && "border-b-0"
                      )}
                      onClick={() => toggleExpanded(row.original.id)}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          onClick={
                            cell.column.id === "actions"
                              ? (event) => event.stopPropagation()
                              : undefined
                          }
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                    {expanded && (
                      <TableRow key={`${row.id}-details`} className="hover:bg-transparent">
                        <TableCell colSpan={columns.length} className="p-0">
                          <ContractExpandedDetails
                            contract={row.original}
                            locale={locale}
                          />
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-8 text-center text-slate-500">
                  {tCommon("noData")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
