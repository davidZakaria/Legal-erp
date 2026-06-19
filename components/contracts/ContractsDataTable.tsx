"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { addDays, isBefore } from "date-fns";
import { AlertTriangle, Download, Radar } from "lucide-react";
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
import { cn } from "@/lib/utils";

export type ContractRow = {
  id: string;
  contractorName: string;
  projectName: string;
  projectLocation: string;
  totalValue: string;
  guaranteeExpiryDate: string;
  penaltyClause: string;
  status: string;
};

const columnHelper = createColumnHelper<ContractRow>();

function isExpiringSoon(dateStr: string): boolean {
  const expiry = new Date(dateStr);
  const threshold = addDays(new Date(), 30);
  return isBefore(expiry, threshold);
}

export function ContractsDataTable({ data }: { data: ContractRow[] }) {
  const t = useTranslations("contracts");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  const columns = [
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
          {Number(info.getValue()).toLocaleString()} EGP
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
        <Button variant="outline" size="sm" className="gap-2" asChild>
          <a href={`/api/contracts/${info.row.original.id}/download`}>
            <Download className="h-4 w-4" />
            {tCommon("download")}
          </a>
        </Button>
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
                return (
                  <TableRow
                    key={row.id}
                    className={cn(
                      "bg-white",
                      expiring && "bg-destructive/5 hover:bg-destructive/10"
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
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
