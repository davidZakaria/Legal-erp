"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  ALL_PERMISSIONS,
  PERMISSION_ACTIONS,
  PERMISSION_ACTION_LABELS,
  PERMISSION_MODULES,
  PERMISSION_MODULE_LABELS,
  buildPermission,
  type Permission,
  type PermissionAction,
  type PermissionModule,
} from "@/lib/permissions/constants";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type PermissionsMatrixProps = {
  value: Permission[];
  onChange: (permissions: Permission[]) => void;
  disabled?: boolean;
};

function columnPermissions(action: PermissionAction): Permission[] {
  return PERMISSION_MODULES.map((module) => buildPermission(module, action));
}

function rowPermissions(module: PermissionModule): Permission[] {
  return PERMISSION_ACTIONS.map((action) => buildPermission(module, action));
}

function mergePermissions(current: Permission[], add: Permission[]): Permission[] {
  return Array.from(new Set([...current, ...add]));
}

function removePermissions(current: Permission[], remove: Permission[]): Permission[] {
  const removeSet = new Set(remove);
  return current.filter((permission) => !removeSet.has(permission));
}

function selectionState(
  permissions: Permission[],
  selected: Permission[]
): boolean | "indeterminate" {
  const count = permissions.filter((permission) => selected.includes(permission)).length;
  if (count === 0) return false;
  if (count === permissions.length) return true;
  return "indeterminate";
}

export function PermissionsMatrix({ value, onChange, disabled }: PermissionsMatrixProps) {
  const locale = useLocale();
  const t = useTranslations("admin");
  const isAr = locale === "ar";

  const toggle = (permission: Permission, checked: boolean) => {
    if (checked) {
      onChange(mergePermissions(value, [permission]));
      return;
    }
    onChange(value.filter((p) => p !== permission));
  };

  const toggleMany = (permissions: Permission[], checked: boolean) => {
    onChange(checked ? mergePermissions(value, permissions) : removePermissions(value, permissions));
  };

  const allSelected = selectionState(ALL_PERMISSIONS, value);

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/80 hover:bg-muted/80">
            <TableHead className="min-w-[140px]">{t("module")}</TableHead>
            {PERMISSION_ACTIONS.map((action) => (
              <TableHead key={action} className="text-center">
                {isAr
                  ? PERMISSION_ACTION_LABELS[action].ar
                  : PERMISSION_ACTION_LABELS[action].en}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableCell className="font-medium text-foreground">
              <label className="flex cursor-pointer items-center gap-2">
                <Checkbox
                  checked={allSelected}
                  disabled={disabled}
                  onCheckedChange={(next) => toggleMany(ALL_PERMISSIONS, next === true)}
                  aria-label={t("selectAllPermissions")}
                />
                <span>{t("selectAllPermissions")}</span>
              </label>
            </TableCell>
            {PERMISSION_ACTIONS.map((action) => {
              const permissions = columnPermissions(action);
              return (
                <TableCell key={action} className="text-center">
                  <div className="flex justify-center">
                    <Checkbox
                      checked={selectionState(permissions, value)}
                      disabled={disabled}
                      onCheckedChange={(next) => toggleMany(permissions, next === true)}
                      aria-label={`${t("selectAllPermissions")} — ${
                        isAr
                          ? PERMISSION_ACTION_LABELS[action].ar
                          : PERMISSION_ACTION_LABELS[action].en
                      }`}
                    />
                  </div>
                </TableCell>
              );
            })}
          </TableRow>
          {PERMISSION_MODULES.map((module) => {
            const modulePermissions = rowPermissions(module);
            return (
              <TableRow key={module}>
                <TableCell className="font-medium text-foreground">
                  <label className="flex cursor-pointer items-center gap-2">
                    <Checkbox
                      checked={selectionState(modulePermissions, value)}
                      disabled={disabled}
                      onCheckedChange={(next) => toggleMany(modulePermissions, next === true)}
                      aria-label={`${t("selectAllPermissions")} — ${
                        isAr
                          ? PERMISSION_MODULE_LABELS[module].ar
                          : PERMISSION_MODULE_LABELS[module].en
                      }`}
                    />
                    <span>
                      {isAr
                        ? PERMISSION_MODULE_LABELS[module].ar
                        : PERMISSION_MODULE_LABELS[module].en}
                    </span>
                  </label>
                </TableCell>
                {PERMISSION_ACTIONS.map((action) => {
                  const permission = buildPermission(module, action);
                  const checked = value.includes(permission);
                  return (
                    <TableCell key={action} className="text-center">
                      <div className="flex justify-center">
                        <Checkbox
                          checked={checked}
                          disabled={disabled}
                          onCheckedChange={(next) => toggle(permission, next === true)}
                          aria-label={permission}
                        />
                      </div>
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
