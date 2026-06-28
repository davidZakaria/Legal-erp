"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { requireAuthenticatedSession } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/auditLogger";
import { canAccessAdminSection } from "@/lib/rbac";

export type LookupType = "court" | "policeStation" | "expertOffice" | "project";

const DUPLICATE_NAME_ERROR = "عفواً، هذا الاسم مسجل بالفعل في النظام.";
const FK_DELETE_ERROR = "عفواً، لا يمكن الحذف لوجود بيانات مرتبطة.";
const LOOKUP_IN_USE_ERROR = FK_DELETE_ERROR;
const PROJECT_IN_USE_ERROR = FK_DELETE_ERROR;

type ActionResult =
  | { success: true; id?: string }
  | { success: false; error: string };

async function assertAdmin() {
  const gate = await requireAuthenticatedSession();
  if (!gate.success || !canAccessAdminSection(gate.session.user.role)) {
    return null;
  }
  return gate.session;
}

function entityName(type: LookupType) {
  switch (type) {
    case "court":
      return "CourtLookup";
    case "policeStation":
      return "PoliceStationLookup";
    case "expertOffice":
      return "ExpertOfficeLookup";
    case "project":
      return "Project";
  }
}

function revalidateSettingsPaths() {
  revalidatePath("/admin/settings");
  revalidatePath("/ar/admin/settings");
  revalidatePath("/en/admin/settings");
  revalidatePath("/ar/litigation");
  revalidatePath("/en/litigation");
  revalidatePath("/ar/prosecutions");
  revalidatePath("/en/prosecutions");
  revalidatePath("/ar/contracts");
  revalidatePath("/en/contracts");
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
  );
}

function isForeignKeyConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003"
  );
}

async function getLookupUsageCount(type: LookupType, id: string): Promise<number> {
  switch (type) {
    case "court": {
      const row = await prisma.courtLookup.findUnique({
        where: { id },
        select: { name: true },
      });
      if (!row) return 0;
      return prisma.lawsuit.count({ where: { courtName: row.name } });
    }
    case "policeStation": {
      const row = await prisma.policeStationLookup.findUnique({
        where: { id },
        select: { name: true },
      });
      if (!row) return 0;
      return prisma.prosecution.count({ where: { policeStation: row.name } });
    }
    case "expertOffice": {
      const row = await prisma.expertOfficeLookup.findUnique({
        where: { id },
        select: { name: true },
      });
      if (!row) return 0;
      return prisma.lawsuit.count({ where: { expertOffice: row.name } });
    }
    case "project":
      return prisma.contract.count({ where: { projectId: id } });
  }
}

export async function createLookup(
  type: LookupType,
  name: string,
  options?: { location?: string }
): Promise<ActionResult> {
  const session = await assertAdmin();
  if (!session) {
    return { success: false, error: "Forbidden" };
  }

  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return { success: false, error: "Name must be at least 2 characters" };
  }

  if (type === "project") {
    const location = options?.location?.trim();
    if (!location) {
      return { success: false, error: "Location is required" };
    }
  }

  try {
    let record: { id: string };
    switch (type) {
      case "court":
        record = await prisma.courtLookup.create({ data: { name: trimmed } });
        break;
      case "policeStation":
        record = await prisma.policeStationLookup.create({ data: { name: trimmed } });
        break;
      case "expertOffice":
        record = await prisma.expertOfficeLookup.create({ data: { name: trimmed } });
        break;
      case "project":
        record = await prisma.project.create({
          data: { name: trimmed, location: options!.location!.trim() },
        });
        break;
    }

    await logActivity(session.user.id, "CREATE_LOOKUP", entityName(type), record.id);
    revalidateSettingsPaths();
    return { success: true, id: record.id };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { success: false, error: DUPLICATE_NAME_ERROR };
    }
    return { success: false, error: "Failed to create entry" };
  }
}

export async function updateLookup(
  type: LookupType,
  id: string,
  name: string,
  options?: { location?: string }
): Promise<ActionResult> {
  const session = await assertAdmin();
  if (!session) {
    return { success: false, error: "Forbidden" };
  }

  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return { success: false, error: "Name must be at least 2 characters" };
  }

  if (type === "project") {
    const location = options?.location?.trim();
    if (!location) {
      return { success: false, error: "Location is required" };
    }
  }

  try {
    switch (type) {
      case "court":
        await prisma.courtLookup.update({ where: { id }, data: { name: trimmed } });
        break;
      case "policeStation":
        await prisma.policeStationLookup.update({ where: { id }, data: { name: trimmed } });
        break;
      case "expertOffice":
        await prisma.expertOfficeLookup.update({ where: { id }, data: { name: trimmed } });
        break;
      case "project":
        await prisma.project.update({
          where: { id },
          data: { name: trimmed, location: options!.location!.trim() },
        });
        break;
    }

    await logActivity(session.user.id, "UPDATE_LOOKUP", entityName(type), id);
    revalidateSettingsPaths();
    return { success: true };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { success: false, error: DUPLICATE_NAME_ERROR };
    }
    return { success: false, error: "Failed to update entry" };
  }
}

export async function deleteLookup(type: LookupType, id: string): Promise<ActionResult> {
  const session = await assertAdmin();
  if (!session) {
    return { success: false, error: "Forbidden" };
  }

  const usageCount = await getLookupUsageCount(type, id);
  if (usageCount > 0) {
    return {
      success: false,
      error: type === "project" ? PROJECT_IN_USE_ERROR : LOOKUP_IN_USE_ERROR,
    };
  }

  try {
    switch (type) {
      case "court":
        await prisma.courtLookup.delete({ where: { id } });
        break;
      case "policeStation":
        await prisma.policeStationLookup.delete({ where: { id } });
        break;
      case "expertOffice":
        await prisma.expertOfficeLookup.delete({ where: { id } });
        break;
      case "project":
        await prisma.project.delete({ where: { id } });
        break;
    }

    await logActivity(session.user.id, "DELETE_LOOKUP", entityName(type), id);
    revalidateSettingsPaths();
    return { success: true };
  } catch (error) {
    if (isForeignKeyConstraintError(error)) {
      return { success: false, error: FK_DELETE_ERROR };
    }
    return { success: false, error: "Delete failed" };
  }
}
