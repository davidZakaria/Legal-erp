"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { Check, Database, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DeleteConfirmDialog } from "@/components/crud/DeleteConfirmDialog";
import type { BackupLogRow } from "@/app/actions/backup-actions";
import {
  cleanupBackups,
  deleteBackup,
  generateAdvancedBackup,
  importBackupZip,
  restoreBackupFromLog,
  verifyBackup,
} from "@/app/actions/backup-actions";

type BackupStats = {
  totalBackups: number;
  retentionDays: number;
  maxBackups: number;
  encryptionConfigured: boolean;
};

type PendingRestore =
  | { mode: "log"; logId: string; label: string }
  | { mode: "import"; formData: FormData };

const actionBtn =
  "rounded-md px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";

const rowBtn =
  "rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";

export function BackupsAdminPanel({
  logs,
  stats,
}: {
  logs: BackupLogRow[];
  stats: BackupStats;
}) {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const importRef = useRef<HTMLInputElement>(null);
  const [isRefreshing, startRefresh] = useTransition();
  const [isCreating, setIsCreating] = useState(false);
  const [isCreatingEncrypted, setIsCreatingEncrypted] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [busyLogId, setBusyLogId] = useState<string | null>(null);
  const [pendingRestore, setPendingRestore] = useState<PendingRestore | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const handleRefresh = () => {
    startRefresh(() => {
      router.refresh();
    });
  };

  const handleCreateBackup = async (isEncrypted: boolean) => {
    if (isEncrypted && !stats.encryptionConfigured) {
      toast.error(t("backupEncryptionRequired"));
      return;
    }

    if (isEncrypted) {
      setIsCreatingEncrypted(true);
    } else {
      setIsCreating(true);
    }

    const result = await generateAdvancedBackup(isEncrypted);
    setIsCreating(false);
    setIsCreatingEncrypted(false);

    if (result.success) {
      toast.success(
        isEncrypted ? t("backupCreateEncryptedSuccess") : t("backupCreateSuccess")
      );
      router.refresh();
      return;
    }

    toast.error(result.error ?? t("backupCreateError"));
  };

  const handleImportSelect = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.set("file", file);
    setPendingRestore({ mode: "import", formData });
    if (importRef.current) importRef.current.value = "";
  };

  const handleCleanup = async () => {
    if (!window.confirm(t("backupCleanupConfirm"))) return;

    setIsCleaning(true);
    const result = await cleanupBackups();
    setIsCleaning(false);

    if (result.success) {
      toast.success(t("backupCleanupSuccess", { count: result.removed }));
      router.refresh();
      return;
    }

    toast.error(result.error ?? t("backupCleanupError"));
  };

  const handleExport = (logId: string) => {
    window.location.href = `/api/backup/download/${encodeURIComponent(logId)}`;
  };

  const handleVerify = async (logId: string) => {
    setBusyLogId(logId);
    const result = await verifyBackup(logId);
    setBusyLogId(null);

    if (result.success) {
      toast.success(t("backupVerifySuccess", { count: result.tableCount }));
      return;
    }

    toast.error(result.error ?? t("backupVerifyError"));
  };

  const handleDelete = async (logId: string) => {
    if (!window.confirm(t("backupDeleteConfirm"))) return;

    setBusyLogId(logId);
    const result = await deleteBackup(logId);
    setBusyLogId(null);

    if (result.success) {
      toast.success(t("backupDeleteSuccess"));
      router.refresh();
      return;
    }

    toast.error(result.error ?? t("backupDeleteError"));
  };

  const handleConfirmRestore = async () => {
    if (!pendingRestore) return;

    setIsRestoring(true);
    try {
      const result =
        pendingRestore.mode === "log"
          ? await restoreBackupFromLog(pendingRestore.logId, "RESTORE")
          : await importBackupZip(pendingRestore.formData, "RESTORE");

      if (result.success) {
        toast.success(t("backupRestoreSuccess"));
        setPendingRestore(null);
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
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className={`${actionBtn} bg-green-500 hover:bg-green-600`}
          disabled={isCreating}
          onClick={() => handleCreateBackup(false)}
        >
          + {isCreating ? tCommon("loading") : t("backupCreate")}
        </button>
        <button
          type="button"
          className={`${actionBtn} bg-purple-600 hover:bg-purple-700`}
          disabled={isCreatingEncrypted}
          onClick={() => handleCreateBackup(true)}
        >
          + {isCreatingEncrypted ? tCommon("loading") : t("backupCreateEncrypted")}
        </button>
        <button
          type="button"
          className={`${actionBtn} bg-cyan-500 hover:bg-cyan-600`}
          onClick={() => importRef.current?.click()}
        >
          {t("backupImport")}
        </button>
        <input
          ref={importRef}
          type="file"
          accept=".zip,application/zip"
          className="hidden"
          onChange={(event) => handleImportSelect(event.target.files)}
        />
        <button
          type="button"
          className={`${actionBtn} bg-orange-500 hover:bg-orange-600`}
          disabled={isCleaning}
          onClick={handleCleanup}
        >
          {isCleaning ? tCommon("loading") : t("backupCleanup")}
        </button>
        <button
          type="button"
          className={`${actionBtn} bg-indigo-500 hover:bg-indigo-600`}
          disabled={isRefreshing}
          onClick={handleRefresh}
        >
          <span className="inline-flex items-center gap-2">
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            {t("backupRefresh")}
          </span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="overflow-hidden border-0 bg-blue-600 text-white shadow-md">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider opacity-90">
              {t("backupKpiTotal")}
            </p>
            <p className="mt-2 text-4xl font-bold">{stats.totalBackups}</p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-0 bg-orange-500 text-white shadow-md">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider opacity-90">
              {t("backupKpiRetention")}
            </p>
            <p className="mt-2 text-4xl font-bold">{stats.retentionDays}</p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-0 bg-purple-600 text-white shadow-md">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider opacity-90">
              {t("backupKpiMax")}
            </p>
            <p className="mt-2 text-4xl font-bold">{stats.maxBackups}</p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-0 bg-green-500 text-white shadow-md">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider opacity-90">
              {t("backupKpiEncryption")}
            </p>
            <div className="mt-2 flex items-center gap-2">
              {stats.encryptionConfigured ? (
                <>
                  <Check className="h-8 w-8 stroke-[3]" />
                  <span className="text-lg font-bold">{t("backupEncryptionReady")}</span>
                </>
              ) : (
                <>
                  <Database className="h-8 w-8 opacity-80" />
                  <span className="text-lg font-bold">{t("backupEncryptionMissing")}</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden border-border shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/80 hover:bg-muted/80">
                <TableHead>{t("backupColId")}</TableHead>
                <TableHead>{t("backupColCreatedAt")}</TableHead>
                <TableHead>{t("backupColSize")}</TableHead>
                <TableHead>{t("backupColFiles")}</TableHead>
                <TableHead>{t("backupColStatus")}</TableHead>
                <TableHead className="text-end">{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    {tCommon("noData")}
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-sm font-semibold">{log.shortId}</TableCell>
                    <TableCell>
                      {format(new Date(log.createdAt), "yyyy-MM-dd HH:mm:ss")}
                    </TableCell>
                    <TableCell>{log.size ?? "—"}</TableCell>
                    <TableCell>{log.files}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge className="border-0 bg-green-500 hover:bg-green-500">
                          ✅ {t("backupStatusDb")}
                        </Badge>
                        {log.isEncrypted && (
                          <Badge className="border-0 bg-purple-600 hover:bg-purple-600">
                            🔒 {t("backupStatusEncrypted")}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-end">
                      <div className="flex flex-wrap justify-end gap-1">
                        <button
                          type="button"
                          className={`${rowBtn} bg-cyan-500 hover:bg-cyan-600`}
                          disabled={!log.filePath || busyLogId === log.id}
                          onClick={() => handleExport(log.id)}
                        >
                          {t("backupExport")}
                        </button>
                        <button
                          type="button"
                          className={`${rowBtn} bg-blue-600 hover:bg-blue-700`}
                          disabled={!log.filePath || busyLogId === log.id}
                          onClick={() => handleVerify(log.id)}
                        >
                          {t("backupVerify")}
                        </button>
                        <button
                          type="button"
                          className={`${rowBtn} bg-green-500 hover:bg-green-600`}
                          disabled={!log.filePath || busyLogId === log.id}
                          onClick={() =>
                            setPendingRestore({
                              mode: "log",
                              logId: log.id,
                              label: log.shortId,
                            })
                          }
                        >
                          {t("backupRestore")}
                        </button>
                        <button
                          type="button"
                          className={`${rowBtn} bg-red-500 hover:bg-red-600`}
                          disabled={busyLogId === log.id}
                          onClick={() => handleDelete(log.id)}
                        >
                          {t("backupDelete")}
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <DeleteConfirmDialog
        open={!!pendingRestore}
        onOpenChange={(open) => {
          if (!open) setPendingRestore(null);
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
