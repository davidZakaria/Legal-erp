import { getTranslations, getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth } from "date-fns";
import { Wallet } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ExpensesModule } from "@/components/expenses/ExpensesModule";
import { CreateExpenseDialog } from "@/components/expenses/CreateExpenseDialog";
import { hasPermission } from "@/lib/permissions";
import { canApproveExpenses } from "@/lib/rbac";
import { ExpenseStatus } from "@prisma/client";

export default async function ExpensesPage() {
  const t = await getTranslations("expenses");
  const locale = await getLocale();
  const session = await auth();

  if (
    session?.user &&
    !(await hasPermission(session.user.id, "FINANCIALS_READ", session.user.role))
  ) {
    redirect({ href: "/", locale });
  }

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
    amount: Number(e.amount),
    description: e.description,
    date: e.date.toISOString(),
    status: e.status,
    lawsuitId: e.lawsuitId,
    lawsuitLabel: e.lawsuit ? `${e.lawsuit.caseNumber} / ${e.lawsuit.year}` : null,
    requestedByName: e.requestedBy.name,
    receiptUrl: e.receiptUrl,
  }));

  const user = session!.user;
  const canCreate = await hasPermission(user.id, "FINANCIALS_CREATE", user.role);
  const canApprove = canApproveExpenses(user.role);
  const canUpdate = await hasPermission(user.id, "FINANCIALS_UPDATE", user.role);
  const canDelete = await hasPermission(user.id, "FINANCIALS_DELETE", user.role);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        icon={Wallet}
        action={<CreateExpenseDialog lawsuits={lawsuitOptions} canCreate={canCreate} />}
      />

      <ExpensesModule
        data={data}
        lawsuits={lawsuitOptions}
        monthTotal={Number(monthAggregate._sum.amount ?? 0)}
        pendingCount={pendingCount}
        canCreate={canCreate}
        canApprove={canApprove}
        canUpdate={canUpdate}
        canDelete={canDelete}
      />
    </div>
  );
}
