"use server";

import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { requireAuthenticatedSession } from "@/lib/auth-guards";
import { logActivity } from "@/lib/auditLogger";
import {
  clearOperationalData,
  getOperationalDataCounts,
} from "@/lib/clear-operational-data";

export async function clearAllOperationalData(confirmation: string) {
  const gate = await requireAuthenticatedSession();
  if (!gate.success) {
    return { success: false as const, error: gate.error };
  }

  const session = gate.session;
  if (session.user.role !== Role.SUPER_ADMIN) {
    return { success: false as const, error: "Forbidden" };
  }

  if (confirmation.trim() !== "CLEAR") {
    return { success: false as const, error: "Confirmation text does not match" };
  }

  const before = await getOperationalDataCounts();

  await clearOperationalData();

  await logActivity(session.user.id, "CLEAR_OPERATIONAL_DATA", "System", session.user.id);

  revalidatePath("/", "layout");

  return { success: true as const, cleared: before };
}

export async function fetchOperationalDataCounts() {
  const gate = await requireAuthenticatedSession();
  if (!gate.success || gate.session.user.role !== Role.SUPER_ADMIN) {
    return null;
  }
  return getOperationalDataCounts();
}
