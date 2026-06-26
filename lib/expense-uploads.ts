export { getExpenseReceiptUploadDir } from "@/lib/upload-paths";

export function expenseReceiptPublicUrl(fileName: string): string {
  return `/uploads/expenses/${fileName}`;
}
