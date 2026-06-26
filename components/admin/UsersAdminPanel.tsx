"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Role } from "@prisma/client";
import { Pencil, UserX, UserCheck, MoreHorizontal, RotateCcw } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateUserDialog } from "@/components/admin/CreateUserDialog";
import {
  EditUserDialog,
  type AdminUserRow,
} from "@/components/admin/EditUserDialog";
import { toggleUserActive, resetUserPassword } from "@/app/actions/admin/users";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";

function roleLabel(role: Role, t: ReturnType<typeof useTranslations<"admin">>) {
  switch (role) {
    case Role.SUPER_ADMIN:
      return t("roleSuperAdmin");
    case Role.LEGAL_MANAGER:
      return t("roleManager");
    default:
      return t("roleLawyer");
  }
}

export function UsersAdminPanel({
  users,
  currentUserId,
  canCreateSuperAdmin,
}: {
  users: AdminUserRow[];
  currentUserId: string;
  canCreateSuperAdmin: boolean;
}) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [editUser, setEditUser] = useState<AdminUserRow | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);

  const handleToggleActive = async (user: AdminUserRow) => {
    setTogglingId(user.id);
    await toggleUserActive(user.id);
    setTogglingId(null);
    router.refresh();
  };

  const handleResetPassword = async (user: AdminUserRow) => {
    if (!window.confirm(t("resetPasswordConfirm", { name: user.name }))) {
      return;
    }

    setResettingId(user.id);
    const result = await resetUserPassword(user.id);
    setResettingId(null);

    if (result.success) {
      toast.success(t("resetPasswordSuccess"));
      router.refresh();
      return;
    }

    toast.error(result.error ?? t("saveError"));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <CreateUserDialog canCreateSuperAdmin={canCreateSuperAdmin} />
      </div>

      <Card className="overflow-hidden border-slate-200 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                <TableHead>{t("name")}</TableHead>
                <TableHead>{t("email")}</TableHead>
                <TableHead>{t("role")}</TableHead>
                <TableHead>{t("permissionsCount")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead className="text-end">{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow
                  key={user.id}
                  className={!user.isActive ? "opacity-60" : undefined}
                >
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{roleLabel(user.role, t)}</Badge>
                  </TableCell>
                  <TableCell>
                    {user.role === Role.LAWYER ? user.permissions.length : t("fullAccess")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? "default" : "destructive"}>
                      {user.isActive ? t("active") : t("inactive")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-end">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setEditUser(user)}
                        aria-label={t("editUser")}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {user.id !== currentUserId && (
                        <Button
                          size="icon"
                          variant="ghost"
                          disabled={togglingId === user.id}
                          onClick={() => handleToggleActive(user)}
                          aria-label={
                            user.isActive ? t("deactivateUser") : t("activateUser")
                          }
                        >
                          {user.isActive ? (
                            <UserX className="h-4 w-4 text-destructive" />
                          ) : (
                            <UserCheck className="h-4 w-4 text-green-600" />
                          )}
                        </Button>
                      )}
                      {canCreateSuperAdmin && user.id !== currentUserId && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" aria-label={t("actions")}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              disabled={resettingId === user.id}
                              onClick={() => handleResetPassword(user)}
                            >
                              <RotateCcw className="me-2 h-4 w-4" />
                              {t("resetPassword")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <EditUserDialog
        user={editUser}
        open={!!editUser}
        onOpenChange={(open) => !open && setEditUser(null)}
        canEditSuperAdmin={canCreateSuperAdmin}
      />
    </div>
  );
}
