import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

export const FK_DELETE_ERROR =
  "عفواً، لا يمكن الحذف لوجود بيانات مرتبطة.";

export type ActionResult =
  | { success: true; id?: string }
  | { success: false; error: string };

export function isForeignKeyConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003"
  );
}

export function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
  );
}

export function revalidateModulePaths(...paths: string[]) {
  for (const route of paths) {
    revalidatePath(route);
    revalidatePath(`/ar${route.startsWith("/") ? route : `/${route}`}`);
    revalidatePath(`/en${route.startsWith("/") ? route : `/${route}`}`);
  }
}

export async function safeDelete(
  deleteFn: () => Promise<void>
): Promise<ActionResult> {
  try {
    await deleteFn();
    return { success: true };
  } catch (error) {
    if (isForeignKeyConstraintError(error)) {
      return { success: false, error: FK_DELETE_ERROR };
    }
    return { success: false, error: "Delete failed" };
  }
}
