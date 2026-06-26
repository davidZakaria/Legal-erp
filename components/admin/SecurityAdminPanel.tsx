"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { Download, Shield, Upload } from "lucide-react";
import { toast } from "sonner";
import { BackupType } from "@prisma/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DeleteConfirmDialog } from "@/components/crud/DeleteConfirmDialog";
import { updateSecuritySettings } from "@/app/actions/admin/security";
import { restoreBackup } from "@/app/actions/admin/restoreBackup";
import { useRouter } from "@/i18n/navigation";

type BackupLogRow = {
  id: string;
  fileName: string;
  type: BackupType;
  createdAt: string;
};

export function SecurityAdminPanel({
  isTwoFactorEnabled,
  secondaryEmail,
  primaryEmail,
  backupLogs,
}: {
  isTwoFactorEnabled: boolean;
  secondaryEmail: string | null;
  primaryEmail: string;
  backupLogs: BackupLogRow[];
}) {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(isTwoFactorEnabled);
  const [secondary, setSecondary] = useState(secondaryEmail ?? "");
  const [isSaving, startSaveTransition] = useTransition();
  const [isExporting, setIsExporting] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restoreJson, setRestoreJson] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const handleSaveSettings = () => {
    startSaveTransition(async () => {
      const formData = new FormData();
      formData.set("isTwoFactorEnabled", String(twoFactorEnabled));
      formData.set("secondaryEmail", secondary);
      const result = await updateSecuritySettings(formData);
      if (result.success) {
        toast.success(t("securitySettingsSaved"));
        router.refresh();
        return;
      }
      toast.error(result.error ?? t("saveError"));
    });
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch("/api/backup/export");
      if (!response.ok) {
        toast.error(t("backupExportError"));
        return;
      }
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="(.+)"/);
      const fileName = match?.[1] ?? "NJD_Backup.json";
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success(t("backupExportSuccess"));
      router.refresh();
    } catch {
      toast.error(t("backupExportError"));
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      JSON.parse(text);
      setRestoreJson(text);
      setRestoreOpen(true);
    } catch {
      toast.error(t("backupInvalidFile"));
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleConfirmRestore = async () => {
    if (!restoreJson) return;
    setIsRestoring(true);
    try {
      const result = await restoreBackup(restoreJson, "RESTORE");
      if (result.success) {
        toast.success(t("backupRestoreSuccess"));
        setRestoreOpen(false);
        setRestoreJson(null);
        router.refresh();
        return;
      }
      toast.error(result.error ?? t("backupRestoreError"));
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t("securityTwoFactorTitle")}
          </CardTitle>
          <CardDescription>{t("securityTwoFactorDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
            <div>
              <p className="font-medium">{t("securityEnable2fa")}</p>
              <p className="text-sm text-muted-foreground">{t("securityEnable2faHint")}</p>
            </div>
            <Switch checked={twoFactorEnabled} onCheckedChange={setTwoFactorEnabled} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="primaryEmail">{t("email")}</Label>
            <Input id="primaryEmail" value={primaryEmail} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="secondaryEmail">{t("securitySecondaryEmail")}</Label>
            <Input
              id="secondaryEmail"
              type="email"
              value={secondary}
              onChange={(event) => setSecondary(event.target.value)}
              placeholder={t("securitySecondaryEmailPlaceholder")}
            />
          </div>
          <Button onClick={handleSaveSettings} disabled={isSaving}>
            {isSaving ? tCommon("saving") : tCommon("save")}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle>{t("securityBackupTitle")}</CardTitle>
          <CardDescription>{t("securityBackupDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button onClick={handleExport} disabled={isExporting} className="gap-2">
            <Download className="h-4 w-4" />
            {isExporting ? tCommon("loading") : t("backupExportButton")}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => handleFileSelect(event.target.files)}
          />
          <Button
            type="button"
            variant="destructive"
            className="gap-2"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            {t("backupRestoreButton")}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle>{t("backupHistoryTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("backupFileName")}</TableHead>
                <TableHead>{t("backupType")}</TableHead>
                <TableHead>{t("backupCreatedAt")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {backupLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    {tCommon("noData")}
                  </TableCell>
                </TableRow>
              ) : (
                backupLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-sm">{log.fileName}</TableCell>
                    <TableCell>
                      {log.type === BackupType.AUTO ? t("backupTypeAuto") : t("backupTypeManual")}
                    </TableCell>
                    <TableCell>{format(new Date(log.createdAt), "yyyy-MM-dd HH:mm")}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <DeleteConfirmDialog
        open={restoreOpen}
        onOpenChange={(open) => {
          setRestoreOpen(open);
          if (!open) setRestoreJson(null);
        }}
        itemName="RESTORE"
        title={t("backupRestoreConfirmTitle")}
        description={t("backupRestoreConfirmDescription")}
        isPending={isRestoring}
        onConfirm={handleConfirmRestore}
      />
    </div>
  );
}
