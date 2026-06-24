import { Role } from "@prisma/client";

export function canViewAuditLogs(role: Role): boolean {
  return role === Role.SUPER_ADMIN || role === Role.LEGAL_MANAGER;
}

export function canDownloadContract(
  role: Role,
  userId: string,
  assignedLawyerIds: string[] = []
): boolean {
  if (role === Role.SUPER_ADMIN || role === Role.LEGAL_MANAGER) {
    return true;
  }
  if (role === Role.LAWYER) {
    return assignedLawyerIds.includes(userId);
  }
  return false;
}

export function canLogSessionOutcome(
  role: Role,
  userId: string,
  assignedLawyerId: string
): boolean {
  if (role === Role.SUPER_ADMIN || role === Role.LEGAL_MANAGER) {
    return true;
  }
  return role === Role.LAWYER && userId === assignedLawyerId;
}

export function isManagerOrAbove(role: Role): boolean {
  return role === Role.SUPER_ADMIN || role === Role.LEGAL_MANAGER;
}

export function canCreateLawsuit(role: Role): boolean {
  return isManagerOrAbove(role);
}

export function canManageGafiTasks(role: Role): boolean {
  return isManagerOrAbove(role);
}

export function canCreateContract(role: Role): boolean {
  return (
    role === Role.SUPER_ADMIN ||
    role === Role.LEGAL_MANAGER ||
    role === Role.LAWYER
  );
}

export function canManageProsecutions(role: Role): boolean {
  return (
    role === Role.SUPER_ADMIN ||
    role === Role.LEGAL_MANAGER ||
    role === Role.LAWYER
  );
}

export function canApproveExpenses(role: Role): boolean {
  return isManagerOrAbove(role);
}

export function canUploadLibraryDocuments(role: Role): boolean {
  return isManagerOrAbove(role);
}

export function canViewPerformanceDashboard(role: Role): boolean {
  return isManagerOrAbove(role);
}

export function canRequestExpense(role: Role): boolean {
  return (
    role === Role.SUPER_ADMIN ||
    role === Role.LEGAL_MANAGER ||
    role === Role.LAWYER
  );
}
