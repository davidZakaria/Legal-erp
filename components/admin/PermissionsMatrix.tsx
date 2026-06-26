"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  PERMISSION_ACTIONS,
  PERMISSION_ACTION_LABELS,
  PERMISSION_MODULES,
  PERMISSION_MODULE_LABELS,
  buildPermission,
  type Permission,
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

export function PermissionsMatrix({ value, onChange, disabled }: PermissionsMatrixProps) {
  const locale = useLocale();
  const t = useTranslations("admin");
  const isAr = locale === "ar";

  const toggle = (permission: Permission, checked: boolean) => {
    if (checked) {
      onChange(Array.from(new Set([...value, permission])));
      return;
    }
    onChange(value.filter((p) => p !== permission));
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
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
          {PERMISSION_MODULES.map((module) => (
            <TableRow key={module}>
              <TableCell className="font-medium text-slate-800">
                {isAr
                  ? PERMISSION_MODULE_LABELS[module].ar
                  : PERMISSION_MODULE_LABELS[module].en}
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
                        onCheckedChange={(next) =>
                          toggle(permission, next === true)
                        }
                        aria-label={permission}
                      />
                    </div>
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
