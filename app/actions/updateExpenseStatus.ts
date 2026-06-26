"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/auditLogger";
import { hasPermission } from "@/lib/permissions";
import { ExpenseStatus } from "@prisma/client";

export async function updateExpenseStatus(
  expenseId: string,
  action: "approve" | "reject" | "reimburse"
) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Unauthorized" };
  }

  if (!(await hasPermission(session.user.id, "FINANCIALS_UPDATE", session.user.role))) {
    return { success: false, error: "Forbidden" };
  }

  const expense = await prisma.expense.findUnique({ where: { id: expenseId } });
  if (!expense) {
    return { success: false, error: "Expense not found" };
  }

  if (action === "reject") {
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
