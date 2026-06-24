import path from "path";

export function getExpenseReceiptUploadDir(): string {
  return path.join(process.cwd(), "public", "uploads", "expenses");
}

export function expenseReceiptPublicUrl(fileName: string): string {
  return `/uploads/expenses/${fileName}`;
}
