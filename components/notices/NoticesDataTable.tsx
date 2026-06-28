"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { LegalNoticeDeliveryStatus } from "@prisma/client";
import { MoreHorizontal, Pencil, RefreshCw, Scale, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteConfirmDialog } from "@/components/crud/DeleteConfirmDialog";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { LegalNoticeDeliveryBadge } from "@/components/notices/LegalNoticeDeliveryBadge";

export type LegalNoticeRow = {
  id: string;
  noticeNumber: string | null;
  year: string;
  bailiffOffice: string;
  clientName: string;
  opponentName: string;
  noticeType: string;
  submissionDate: string;
  deliveryStatus: LegalNoticeDeliveryStatus;
  deliveryDate: string | null;
  followUpDate: string | null;
  assignedLawyerId: string;
  lawyerName: string;
  contractId: string | null;
  lawsuitId: string | null;
  notes: string | null;
};

const columnHelper = createColumnHelper<LegalNoticeRow>();

export function NoticesDataTable({
  data,
  currentUserId,
  canEdit,
  canDelete,
  onEdit,
  onUpdateDelivery,
  onEscalate,
  canEscalateToLawsuit = false,
  onDelete,
  deleteSuccessMessage,
  deleteErrorMessage,
}: {
  data: LegalNoticeRow[];
  currentUserId: string;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (row: LegalNoticeRow) => void;
  onUpdateDelivery: (row: LegalNoticeRow) => void;
  onEscalate?: (row: LegalNoticeRow) => void;
  canEscalateToLawsuit?: boolean;
  onDelete: (id: string) => Promise<{ success: boolean; error?: string }>;
  deleteSuccessMessage?: string;
  deleteErrorMessage?: string;
}) {
  const t = useTranslations("notices");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<LegalNoticeRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const canUpdateDeliveryForRow = (row: LegalNoticeRow) =>
    canEdit || row.assignedLawyerId === currentUserId;

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const result = await onDelete(deleteTarget.id);
    setIsDeleting(false);

    if (result.success) {
      toast.success(deleteSuccessMessage ?? tCommon("deleteSuccess"));
      setDeleteTarget(null);
      startTransition(() => router.refresh());
      return;
    }

    toast.error(result.error ?? deleteErrorMessage ?? tCommon("deleteFailed"));
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor("noticeNumber", {
        header: t("noticeNumber"),
        cell: (info) => info.getValue() ?? "—",
      }),
      columnHelper.accessor("year", {
        header: t("year"),
      }),
      columnHelper.accessor("opponentName", {
        header: t("opponentName"),
        cell: (info) => <span className="font-medium">{info.getValue()}</span>,
      }),
      columnHelper.accessor("noticeType", {
        header: t("noticeType"),
      }),
      columnHelper.accessor("bailiffOffice", {
        header: t("bailiffOffice"),
      }),
      columnHelper.accessor("submissionDate", {
        header: t("submissionDate"),
        cell: (info) => format(new Date(info.getValue()), "yyyy-MM-dd"),
      }),
      columnHelper.accessor("followUpDate", {
        header: t("followUpDate"),
        cell: (info) => {
          const value = info.getValue();
          return value ? format(new Date(value), "yyyy-MM-dd") : "—";
        },
      }),
      columnHelper.accessor("deliveryStatus", {
        header: t("deliveryStatus"),
        cell: (info) => <LegalNoticeDeliveryBadge status={info.getValue()} />,
      }),
      columnHelper.accessor("lawyerName", {
        header: t("assignedLawyer"),
      }),
      columnHelper.display({
        id: "actions",
        header: () => tCommon("actions"),
        cell: ({ row }) => {
          const notice = row.original;
          const showDelivery = canUpdateDeliveryForRow(notice);
          const showEscalate =
            canEscalateToLawsuit &&
            onEscalate &&
            notice.deliveryStatus === LegalNoticeDeliveryStatus.DELIVERED_SUCCESS &&
            !notice.lawsuitId;

          if (!showDelivery && !showEscalate && !canEdit && !canDelete) return null;

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" aria-label={tCommon("actions")}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {showDelivery && (
                  <DropdownMenuItem onClick={() => onUpdateDelivery(notice)}>
                    <RefreshCw className="me-2 h-4 w-4" />
                    {t("updateDeliveryAction")}
                  </DropdownMenuItem>
                )}
                {showEscalate && (
                  <DropdownMenuItem onClick={() => onEscalate!(notice)}>
                    <Scale className="me-2 h-4 w-4" />
                    {t("escalateToLawsuit")}
                  </DropdownMenuItem>
                )}
                {canEdit && (
                  <PermissionGuard permission="NOTICES_UPDATE">
                    <DropdownMenuItem onClick={() => onEdit(notice)}>
                      <Pencil className="me-2 h-4 w-4" />
                      {tCommon("edit")}
                    </DropdownMenuItem>
                  </PermissionGuard>
                )}
                {canDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <PermissionGuard permission="NOTICES_DELETE">
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteTarget(notice)}
                      >
                        <Trash2 className="me-2 h-4 w-4" />
                        {tCommon("delete")}
                      </DropdownMenuItem>
                    </PermissionGuard>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      }),
    ],
    [
      t,
      tCommon,
      canEdit,
      canDelete,
      canEscalateToLawsuit,
      currentUserId,
      onEdit,
      onUpdateDelivery,
      onEscalate,
    ]
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
      <Card className="border-border shadow-sm">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-base text-foreground">{t("tableTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">{tCommon("noData")}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id} className="bg-muted/80">
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        itemName={deleteTarget?.opponentName ?? ""}
        isPending={isDeleting}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
