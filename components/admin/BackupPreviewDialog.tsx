"use client";

import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { BackupManifestPreview } from "@/lib/backup-manifest";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function BackupPreviewDialog({
  open,
  onOpenChange,
  fileName,
  preview,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileName: string;
  preview: BackupManifestPreview | null;
}) {
  const t = useTranslations("admin");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto border-border">
        <DialogHeader>
          <DialogTitle>{t("backupPreviewTitle")}</DialogTitle>
          <DialogDescription>{fileName}</DialogDescription>
        </DialogHeader>

        {!preview ? (
          <p className="text-sm text-muted-foreground">{t("backupPreviewEmpty")}</p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">
                {t("backupPreviewTables", { count: preview.databaseTables })}
              </Badge>
              <Badge variant="secondary">
                {t("backupPreviewTotalFiles", { count: preview.totalFiles })}
              </Badge>
              <Badge variant="secondary">{formatBytes(preview.totalBytes)}</Badge>
            </div>

            <div className="space-y-3">
              {preview.categories.map((category) => (
                <div
                  key={category.category}
                  className="rounded-lg border border-border bg-muted/30 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">{category.label}</p>
                    <Badge className="border-0 bg-primary/90 hover:bg-primary/90">
                      {category.fileCount}
                    </Badge>
                  </div>
                  {category.sampleFiles.length > 0 && (
                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                      {category.sampleFiles.map((file) => (
                        <li key={file} className="truncate font-mono">
                          • {file}
                        </li>
                      ))}
                      {category.fileCount > category.sampleFiles.length && (
                        <li className="italic">
                          {t("backupPreviewMoreFiles", {
                            count: category.fileCount - category.sampleFiles.length,
                          })}
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
