"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { format } from "date-fns";
import { useRouter } from "@/i18n/navigation";
import { Check, X, Banknote } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateExpenseStatus } from "@/app/actions/updateExpenseStatus";
import { RecordActions } from "@/components/crud/RecordActions";
import { cn } from "@/lib/utils";

export type ExpenseRow = {
  id: string;
  amount: number;
  description: string;
  date: string;
  status: string;
  lawsuitId: string | null;
  lawsuitLabel: string | null;
  requestedByName: string;
  receiptUrl: string | null;
};

const statusStyles: Record<string, string> = {
  PENDING_APPROVAL: "bg-amber-100 text-amber-800",
  APPROVED: "bg-blue-100 text-blue-800",
  REIMBURSED: "bg-emerald-100 text-emerald-800",
};

export function ExpensesDataTable({
  data,
  canApprove,
  canUpdate = false,
  canDelete = false,
  onEdit,
  onDelete,
  deleteSuccessMessage,
  deleteErrorMessage,
}: {
  data: ExpenseRow[];
  canApprove: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
  onEdit?: (row: ExpenseRow) => void;
  onDelete?: (id: string) => Promise<{ success: boolean; error?: string }>;
  deleteSuccessMessage?: string;
  deleteErrorMessage?: string;
}) {
  const t = useTranslations("expenses");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleAction = async (
    id: string,
    action: "approve" | "reject" | "reimburse"
  ) => {
    setLoadingId(id);
    await updateExpenseStatus(id, action);
    setLoadingId(null);
    router.refresh();
  };

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="border-b border-slate-100">
        <CardTitle className="text-base text-slate-900">{t("tableTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {data.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-slate-500">{tCommon("noData")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80">
                <TableHead>{t("date")}</TableHead>
                <TableHead>{t("description")}</TableHead>
                <TableHead>{t("amount")}</TableHead>
                <TableHead>{t("linkedLawsuit")}</TableHead>
                <TableHead>{t("requestedBy")}</TableHead>
                <TableHead>{tCommon("status")}</TableHead>
                {canApprove && <TableHead className="text-center">{tCommon("actions")}</TableHead>}
                {(canUpdate || canDelete) && (
                  <TableHead className="text-center">{tCommon("edit")}</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{format(new Date(row.date), "yyyy-MM-dd")}</TableCell>
                  <TableCell className="max-w-xs font-medium">{row.description}</TableCell>
                  <TableCell className="font-semibold">
                    {row.amount.toLocaleString(locale === "ar" ? "ar-EG" : "en-US")} {t("currency")}
                  </TableCell>
                  <TableCell>{row.lawsuitLabel ?? "—"}</TableCell>
                  <TableCell>{row.requestedByName}</TableCell>
                  <TableCell>
                    <Badge className={cn("border-0", statusStyles[row.status])}>
                      {t(`status_${row.status}`)}
                    </Badge>
                  </TableCell>
                  {canApprove && (
                    <TableCell>
                      <div className="flex justify-center gap-1">
                        {row.status === "PENDING_APPROVAL" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-emerald-700"
                              disabled={loadingId === row.id}
                              onClick={() => handleAction(row.id, "approve")}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-red-600"
                              disabled={loadingId === row.id}
                              onClick={() => handleAction(row.id, "reject")}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {row.status === "APPROVED" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1"
                            disabled={loadingId === row.id}
                            onClick={() => handleAction(row.id, "reimburse")}
                          >
                            <Banknote className="h-4 w-4" />
                            {t("markReimbursed")}
                          </Button>
                        )}
                        {row.receiptUrl && (
                          <Button size="sm" variant="ghost" className="h-8" asChild>
                            <a href={row.receiptUrl} target="_blank" rel="noopener noreferrer">
                              {tCommon("download")}
                            </a>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                  {(canUpdate || canDelete) && (
                    <TableCell>
                      <RecordActions
                        showEdit={canUpdate && row.status === "PENDING_APPROVAL"}
                        showDelete={canDelete}
                        onEdit={onEdit ? () => onEdit(row) : undefined}
                        onDelete={onDelete ? () => onDelete(row.id) : undefined}
                        deleteItemName={row.description}
                        deleteSuccessMessage={deleteSuccessMessage}
                        deleteErrorMessage={deleteErrorMessage}
                      />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export function ExpenseKpiCards({
  monthTotal,
  pendingCount,
}: {
  monthTotal: number;
  pendingCount: number;
}) {
  const t = useTranslations("expenses");
  const locale = useLocale();

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">{t("monthTotal")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-slate-900">
            {monthTotal.toLocaleString(locale === "ar" ? "ar-EG" : "en-US")}{" "}
            <span className="text-lg font-medium text-slate-500">{t("currency")}</span>
          </p>
        </CardContent>
      </Card>
      <Card className="border-amber-200 bg-amber-50/50 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-amber-800">{t("pendingReimbursements")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-amber-900">{pendingCount}</p>
        </CardContent>
      </Card>
    </div>
  );
}
