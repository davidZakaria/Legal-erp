"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Role } from "@prisma/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PermissionsMatrix } from "@/components/admin/PermissionsMatrix";
import { updateUser } from "@/app/actions/admin/users";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { sanitizePermissions, type Permission } from "@/lib/permissions/constants";

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  permissions: string[];
  isActive: boolean;
  isTwoFactorEnabled: boolean;
};

type EditUserDialogProps = {
  user: AdminUserRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canEditSuperAdmin: boolean;
};

export function EditUserDialog({
  user,
  open,
  onOpenChange,
  canEditSuperAdmin,
}: EditUserDialogProps) {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<Role>(Role.LAWYER);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [changePassword, setChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (user) {
      setRole(user.role);
      setPermissions(sanitizePermissions(user.permissions));
      setChangePassword(false);
      setNewPassword("");
      setConfirmPassword("");
      setError(null);
    }
  }, [user]);

  if (!user) return null;

  const isSuperAdminTarget = user.role === Role.SUPER_ADMIN;
  const readOnly = isSuperAdminTarget && !canEditSuperAdmin;

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (readOnly) return;

    if (changePassword) {
      if (newPassword.length < 8) {
        setError(t("passwordMinLength"));
        return;
      }
      if (newPassword !== confirmPassword) {
        setError(t("passwordMismatch"));
        return;
      }
    }

    setSubmitting(true);
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("userId", user.id);
    formData.set("role", role);
    formData.set(
      "permissions",
      JSON.stringify(role === Role.LAWYER ? permissions : [])
    );
    if (changePassword) {
      formData.set("password", newPassword);
      formData.set("confirmPassword", confirmPassword);
    }

    const result = await updateUser(formData);
    setSubmitting(false);

    if (result.success) {
      onOpenChange(false);
      if (result.passwordUpdated) {
        toast.success(
          t("passwordUpdatedSuccess", { email: result.email ?? user.email })
        );
      } else {
        toast.success(t("saveSuccess"));
      }
      router.refresh();
      return;
    }

    setError(result.error ?? t("saveError"));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("editUser")}</DialogTitle>
          <DialogDescription>{user.email}</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">{t("name")}</Label>
              <Input
                id="edit-name"
                name="name"
                defaultValue={user.name}
                required
                disabled={readOnly}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">{t("email")}</Label>
              <Input
                id="edit-email"
                name="email"
                type="email"
                defaultValue={user.email}
                required
                disabled={readOnly}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-phone">{t("phone")}</Label>
            <Input
              id="edit-phone"
              name="phone"
              defaultValue={user.phone ?? ""}
              disabled={readOnly}
            />
          </div>

          {!readOnly && (
            <div className="space-y-3 rounded-lg border border-border p-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={changePassword}
                  onChange={(event) => {
                    setChangePassword(event.target.checked);
                    if (!event.target.checked) {
                      setNewPassword("");
                      setConfirmPassword("");
                    }
                  }}
                  className="h-4 w-4 rounded border-border"
                />
                {t("changePassword")}
              </label>
              {changePassword && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-password">{t("newPassword")}</Label>
                    <Input
                      id="edit-password"
                      type="password"
                      minLength={8}
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-confirm-password">{t("confirmPassword")}</Label>
                    <Input
                      id="edit-confirm-password"
                      type="password"
                      minLength={8}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      autoComplete="new-password"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>{t("role")}</Label>
            <Select
              value={role}
              onValueChange={(value) => setRole(value as Role)}
              disabled={readOnly}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={Role.LAWYER}>{t("roleLawyer")}</SelectItem>
                <SelectItem value={Role.LEGAL_MANAGER}>{t("roleManager")}</SelectItem>
                {canEditSuperAdmin && (
                  <SelectItem value={Role.SUPER_ADMIN}>{t("roleSuperAdmin")}</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {role === Role.LAWYER && (
            <div className="space-y-2">
              <Label>{t("permissionsMatrix")}</Label>
              <PermissionsMatrix
                value={permissions}
                onChange={setPermissions}
                disabled={readOnly}
              />
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          {!readOnly && (
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {tCommon("cancel")}
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? tCommon("saving") : tCommon("save")}
              </Button>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
