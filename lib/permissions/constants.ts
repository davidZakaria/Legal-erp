export const PERMISSION_MODULES = [
  "LAWSUITS",
  "PROSECUTIONS",
  "GAFI",
  "CONTRACTS",
  "FINANCIALS",
] as const;

export const PERMISSION_ACTIONS = ["READ", "CREATE", "UPDATE", "DELETE"] as const;

export type PermissionModule = (typeof PERMISSION_MODULES)[number];
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];
export type Permission = `${PermissionModule}_${PermissionAction}`;

export function buildPermission(
  module: PermissionModule,
  action: PermissionAction
): Permission {
  return `${module}_${action}`;
}

export const ALL_PERMISSIONS: Permission[] = PERMISSION_MODULES.flatMap((module) =>
  PERMISSION_ACTIONS.map((action) => buildPermission(module, action))
);

/** Default permissions for new lawyer accounts */
export const DEFAULT_LAWYER_PERMISSIONS: Permission[] = [
  "LAWSUITS_READ",
  "LAWSUITS_CREATE",
  "PROSECUTIONS_READ",
  "PROSECUTIONS_CREATE",
  "GAFI_READ",
  "CONTRACTS_READ",
  "CONTRACTS_CREATE",
  "FINANCIALS_READ",
  "FINANCIALS_CREATE",
];

export const PERMISSION_MODULE_LABELS: Record<
  PermissionModule,
  { en: string; ar: string }
> = {
  LAWSUITS: { en: "Lawsuits", ar: "القضايا" },
  PROSECUTIONS: { en: "Prosecutions", ar: "النيابات" },
  GAFI: { en: "GAFI", ar: "هيئة الاستثمار" },
  CONTRACTS: { en: "Contracts", ar: "العقود" },
  FINANCIALS: { en: "Financials", ar: "الماليات" },
};

export const PERMISSION_ACTION_LABELS: Record<
  PermissionAction,
  { en: string; ar: string }
> = {
  READ: { en: "View", ar: "عرض" },
  CREATE: { en: "Create", ar: "إضافة" },
  UPDATE: { en: "Edit", ar: "تعديل" },
  DELETE: { en: "Delete", ar: "حذف" },
};

export function isValidPermission(value: string): value is Permission {
  return ALL_PERMISSIONS.includes(value as Permission);
}

export function sanitizePermissions(values: string[]): Permission[] {
  return values.filter(isValidPermission);
}
