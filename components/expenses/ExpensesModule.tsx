"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ExpensesDataTable, ExpenseKpiCards, type ExpenseRow } from "./ExpensesDataTable";
import {
  CreateExpenseDialog,
  type ExpenseFormInitialData,
  type LawsuitOption,
} from "./CreateExpenseDialog";
import { deleteExpense } from "@/app/actions/expenseCrud";

export function ExpensesModule({
  data,
  lawsuits,
  monthTotal,
  pendingCount,
  canCreate,
  canApprove,
  canUpdate,
  canDelete,
}: {
  data: ExpenseRow[];
  lawsuits: LawsuitOption[];
  monthTotal: number;
  pendingCount: number;
  canCreate: boolean;
  canApprove: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const tCommon = useTranslations("common");
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<ExpenseFormInitialData | null>(null);

  const handleEdit = (row: ExpenseRow) => {
    setEditItem({
      id: row.id,
      amount: row.amount,
      description: row.description,
      date: row.date,
      lawsuitId: row.lawsuitId,
    });
    setEditOpen(true);
  };

  return (
    <>
      <ExpenseKpiCards monthTotal={monthTotal} pendingCount={pendingCount} />
      <ExpensesDataTable
        data={data}
        canApprove={canApprove}
        canUpdate={canUpdate}
        canDelete={canDelete}
        onEdit={handleEdit}
        onDelete={(id) => deleteExpense(id)}
        deleteSuccessMessage={tCommon("deleteSuccess")}
        deleteErrorMessage={tCommon("deleteFailed")}
      />
      <CreateExpenseDialog
        lawsuits={lawsuits}
        canCreate={canCreate}
        initialData={editItem}
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setEditItem(null);
        }}
        hideTrigger
      />
    </>
  );
}
