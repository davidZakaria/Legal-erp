"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireAuthenticatedSession } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/auditLogger";
import { hasPermission } from "@/lib/permissions";
import { ExpenseStatus } from "@prisma/client";
import { notifyExpenseDecisionNonBlocking } from "@/lib/notifications/assignment-matrix";

export async function updateExpenseStatus(
  expenseId: string,
  action: "approve" | "reject" | "reimburse"
) {
  const gate = await requireAuthenticatedSession();
  if (!gate.success) {
    return { success: false, error: gate.error };
  }
  const session = gate.session;

  if (!(await hasPermission(session.user.id, "FINANCIALS_UPDATE", session.user.role))) {
    return { success: false, error: "Forbidden" };
  }

  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: { requestedBy: { select: { id: true, email: true, name: true } } },
  });
  if (!expense) {
    return { success: false, error: "Expense not found" };
  }

  if (action === "reject") {
    notifyExpenseDecisionNonBlocking(expense.requestedBy, expense.amount, false);
    await prisma.expense.delete({ where: { id: expenseId } });
    await logActivity(session.user.id, "REJECT", "Expense", expenseId);
    revalidatePath("/ar/expenses");
    revalidatePath("/en/expenses");
    return { success: true };
  }

  if (action === "approve") {
    if (expense.status !== ExpenseStatus.PENDING_APPROVAL) {
      return { success: false, error: "Expense is not pending approval" };
    }
    await prisma.expense.update({
      where: { id: expenseId },
      data: { status: ExpenseStatus.APPROVED },
    });
    notifyExpenseDecisionNonBlocking(expense.requestedBy, expense.amount, true);
    await logActivity(session.user.id, "APPROVE", "Expense", expenseId);
  }

  if (action === "reimburse") {
    if (expense.status !== ExpenseStatus.APPROVED) {
      return { success: false, error: "Expense must be approved first" };
    }
    await prisma.expense.update({
      where: { id: expenseId },
      data: { status: ExpenseStatus.REIMBURSED },
    });
    await logActivity(session.user.id, "REIMBURSE", "Expense", expenseId);
  }

  revalidatePath("/ar/expenses");
  revalidatePath("/en/expenses");
  return { success: true };
}
