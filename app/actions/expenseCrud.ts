"use server";

import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/auditLogger";
import { isManagerOrAbove } from "@/lib/rbac";
import { ExpenseStatus } from "@prisma/client";
import {
  expenseReceiptPublicUrl,
  getExpenseReceiptUploadDir,
} from "@/lib/expense-uploads";
import { joinStoredUploadFile } from "@/lib/upload-paths";
import {
  FK_DELETE_ERROR,
  isForeignKeyConstraintError,
  revalidateModulePaths,
  type ActionResult,
} from "@/lib/server-action-utils";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function updateExpense(id: string, formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };
  if (!isManagerOrAbove(session.user.role)) {
    return { success: false, error: "Forbidden" };
  }

  const existing = await prisma.expense.findUnique({ where: { id } });
  if (!existing) return { success: false, error: "Expense not found" };

  if (existing.status !== ExpenseStatus.PENDING_APPROVAL) {
    return { success: false, error: "Only pending expenses can be edited" };
  }

  const amountStr = formData.get("amount") as string;
  const description = (formData.get("description") as string)?.trim();
  const dateStr = formData.get("date") as string;
  const lawsuitId = (formData.get("lawsuitId") as string)?.trim() || null;
  const receipt = formData.get("receipt");

  const amount = parseFloat(amountStr);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { success: false, error: "Invalid amount" };
  }
  if (!description || !dateStr) {
    return { success: false, error: "Missing required fields" };
  }

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return { success: false, error: "Invalid date" };
  }

  if (lawsuitId) {
    const lawsuit = await prisma.lawsuit.findUnique({ where: { id: lawsuitId } });
    if (!lawsuit) return { success: false, error: "Lawsuit not found" };
  }

  let receiptUrl = existing.receiptUrl;
  if (receipt instanceof File && receipt.size > 0) {
    if (receipt.size > MAX_FILE_SIZE) {
      return { success: false, error: "Receipt exceeds 10MB limit" };
    }
    const uploadDir = getExpenseReceiptUploadDir();
    await mkdir(uploadDir, { recursive: true });
    const ext = path.extname(receipt.name) || ".pdf";
    const storedName = `${randomUUID()}${ext}`;
    await writeFile(
      joinStoredUploadFile(uploadDir, storedName),
      Buffer.from(await receipt.arrayBuffer())
    );
    receiptUrl = expenseReceiptPublicUrl(storedName);
  }

  await prisma.expense.update({
    where: { id },
    data: { amount, description, date, lawsuitId, receiptUrl },
  });

  await logActivity(session.user.id, "UPDATE", "Expense", id);
  revalidateModulePaths("/expenses");
  return { success: true, id };
}

export async function deleteExpense(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };
  if (!isManagerOrAbove(session.user.role)) {
    return { success: false, error: "Forbidden" };
  }

  try {
    await prisma.expense.delete({ where: { id } });
    await logActivity(session.user.id, "DELETE", "Expense", id);
    revalidateModulePaths("/expenses");
    return { success: true };
  } catch (error) {
    if (isForeignKeyConstraintError(error)) {
      return { success: false, error: FK_DELETE_ERROR };
    }
    return { success: false, error: "Delete failed" };
  }
}
