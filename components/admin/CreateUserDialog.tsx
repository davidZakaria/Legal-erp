"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Role } from "@prisma/client";
import { UserPlus } from "lucide-react";
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
import { createUser } from "@/app/actions/admin/users";
import { useRouter } from "@/i18n/navigation";
import {
  DEFAULT_LAWYER_PERMISSIONS,
  type Permission,
} from "@/lib/permissions/constants";

export function CreateUserDialog({
  canCreateSuperAdmin,
}: {
  canCreateSuperAdmin: boolean;
}) {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<Role>(Role.LAWYER);
  const [permissions, setPermissions] = useState<Permission[]>([
    ...DEFAULT_LAWYER_PERMISSIONS,
  ]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("role", role);
    if (role === Role.LAWYER) {
      formData.set("permissions", JSON.stringify(permissions));
    } else {
      formData.set("permissions", JSON.stringify([]));
    }

    const result = await createUser(formData);
    setSubmitting(false);

    if (result.success) {
      setOpen(false);
      form.reset();
      setRole(Role.LAWYER);
      setPermissions([...DEFAULT_LAWYER_PERMISSIONS]);
      router.refresh();
      return;
    }

    setError(result.error ?? t("saveError"));
  };

  return (
    <>
      <Button className="gap-2" onClick={() => setOpen(true)}>
        <UserPlus className="h-4 w-4" />
        {t("addUser")}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("addUser")}</DialogTitle>
            <DialogDescription>{t("addUserDescription")}</DialogDescription>
          </DialogHeader>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="create-name">{t("name")}</Label>
                <Input id="create-name" name="name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-email">{t("email")}</Label>
                <Input id="create-email" name="email" type="email" required />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="create-phone">{t("phone")}</Label>
                <Input id="create-phone" name="phone" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-password">{t("password")}</Label>
                <Input
                  id="create-password"
                  name="password"
                  type="password"
                  minLength={8}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("role")}</Label>
              <Select
                value={role}
                onValueChange={(value) => setRole(value as Role)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={Role.LAWYER}>{t("roleLawyer")}</SelectItem>
                  <SelectItem value={Role.LEGAL_MANAGER}>{t("roleManager")}</SelectItem>
                  {canCreateSuperAdmin && (
                    <SelectItem value={Role.SUPER_ADMIN}>{t("roleSuperAdmin")}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {role === Role.LAWYER && (
              <div className="space-y-2">
                <Label>{t("permissionsMatrix")}</Label>
                <PermissionsMatrix value={permissions} onChange={setPermissions} />
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {tCommon("cancel")}
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? tCommon("saving") : tCommon("save")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
