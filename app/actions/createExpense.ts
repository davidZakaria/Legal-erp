"use server";

import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/auditLogger";
import { canRequestExpense } from "@/lib/rbac";
import {
  expenseReceiptPublicUrl,
  getExpenseReceiptUploadDir,
} from "@/lib/expense-uploads";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function createExpense(formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Unauthorized" };
  }

  if (!canRequestExpense(session.user.role)) {
    return { success: false, error: "Forbidden" };
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
    if (!lawsuit) {
      return { success: false, error: "Lawsuit not found" };
    }
  }

  let receiptUrl: string | null = null;

  if (receipt instanceof File && receipt.size > 0) {
    if (receipt.size > MAX_FILE_SIZE) {
      return { success: false, error: "Receipt exceeds 10MB limit" };
    }
    const uploadDir = getExpenseReceiptUploadDir();
    await mkdir(uploadDir, { recursive: true });
    const ext = path.extname(receipt.name) || ".pdf";
    const storedName = `${randomUUID()}${ext}`;
    await writeFile(
      path.join(uploadDir, storedName),
      Buffer.from(await receipt.arrayBuffer())
    );
    receiptUrl = expenseReceiptPublicUrl(storedName);
  }

  const expense = await prisma.expense.create({
    data: {
      amount,
      description,
      date,
      receiptUrl,
      lawsuitId,
      requestedById: session.user.id,
    },
  });

  await logActivity(session.user.id, "CREATE", "Expense", expense.id);
  revalidatePath("/ar/expenses");
  revalidatePath("/en/expenses");

  return { success: true, expenseId: expense.id };
}
