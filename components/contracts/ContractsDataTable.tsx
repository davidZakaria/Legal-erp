"use client";

import { useTranslations } from "next-intl";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { addDays, isBefore } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download } from "lucide-react";
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

  const columns = [
    columnHelper.accessor("contractorName", {
      header: () => t("contractor"),
    }),
    columnHelper.accessor("projectName", {
      header: () => t("project"),
      cell: (info) => (
        <span>
          {info.getValue()} ({info.row.original.projectLocation})
        </span>
      ),
    }),
    columnHelper.accessor("totalValue", {
      header: () => t("totalValue"),
      cell: (info) => (
        <span>{Number(info.getValue()).toLocaleString()} EGP</span>
      ),
    }),
    columnHelper.accessor("guaranteeExpiryDate", {
      header: () => t("guaranteeExpiry"),
      cell: (info) => {
        const expiring = isExpiringSoon(info.getValue());
        return (
          <div className="flex items-center gap-2">
            <span>{format(new Date(info.getValue()), "yyyy-MM-dd")}</span>
            {expiring && (
              <Badge variant="destructive">{tCommon("expiringSoon")}</Badge>
            )}
          </div>
        );
      },
    }),
    columnHelper.accessor("status", {
      header: () => tCommon("status"),
    }),
    columnHelper.display({
      id: "actions",
      header: () => tCommon("actions"),
      cell: (info) => (
        <Button variant="outline" size="sm" asChild>
          <a href={`/api/contracts/${info.row.original.id}/download`}>
            <Download className="me-1 h-4 w-4" />
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
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-full bg-destructive" />
        <span className="text-sm text-muted-foreground">{t("guaranteeRadar")}</span>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
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
                    className={cn(expiring && "bg-destructive/10")}
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
                <TableCell colSpan={columns.length} className="text-center">
                  {tCommon("noData")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
