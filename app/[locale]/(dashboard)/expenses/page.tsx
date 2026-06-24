import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth } from "date-fns";
import { Wallet } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { CreateExpenseDialog } from "@/components/expenses/CreateExpenseDialog";
import {
  ExpensesDataTable,
  ExpenseKpiCards,
} from "@/components/expenses/ExpensesDataTable";
import { canApproveExpenses, canRequestExpense } from "@/lib/rbac";
import { ExpenseStatus } from "@prisma/client";

export default async function ExpensesPage() {
  const t = await getTranslations("expenses");
  const session = await auth();
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const [expenses, lawsuits, monthAggregate, pendingCount] = await Promise.all([
    prisma.expense.findMany({
      include: {
        requestedBy: { select: { name: true } },
        lawsuit: { select: { caseNumber: true, year: true } },
      },
      orderBy: { date: "desc" },
    }),
    prisma.lawsuit.findMany({
      select: { id: true, caseNumber: true, year: true },
      orderBy: [{ year: "desc" }, { caseNumber: "asc" }],
      take: 200,
    }),
    prisma.expense.aggregate({
      where: {
        date: { gte: monthStart, lte: monthEnd },
        status: { in: [ExpenseStatus.APPROVED, ExpenseStatus.REIMBURSED] },
      },
      _sum: { amount: true },
    }),
    prisma.expense.count({
      where: { status: ExpenseStatus.PENDING_APPROVAL },
    }),
  ]);

  const lawsuitOptions = lawsuits.map((l) => ({
    id: l.id,
    label: `${l.caseNumber} / ${l.year}`,
  }));

  const data = expenses.map((e) => ({
    id: e.id,
    amount: e.amount,
    description: e.description,
    date: e.date.toISOString(),
    status: e.status,
    lawsuitLabel: e.lawsuit ? `${e.lawsuit.caseNumber} / ${e.lawsuit.year}` : null,
    requestedByName: e.requestedBy.name,
    receiptUrl: e.receiptUrl,
  }));

  const canCreate = session?.user ? canRequestExpense(session.user.role) : false;
  const canApprove = session?.user ? canApproveExpenses(session.user.role) : false;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        icon={Wallet}
        action={<CreateExpenseDialog lawsuits={lawsuitOptions} canCreate={canCreate} />}
      />

      <ExpenseKpiCards
        monthTotal={monthAggregate._sum.amount ?? 0}
        pendingCount={pendingCount}
      />

      <ExpensesDataTable data={data} canApprove={canApprove} />
    </div>
  );
}
