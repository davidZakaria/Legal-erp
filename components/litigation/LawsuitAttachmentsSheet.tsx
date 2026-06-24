"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { Eye, Loader2, Paperclip, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { deleteLawsuitAttachment } from "@/app/actions/deleteLawsuitAttachment";

type Attachment = {
  id: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
};

export function LawsuitAttachmentsSheet({
  lawsuitId,
  caseLabel,
  open,
  onOpenChange,
}: {
  lawsuitId: string;
  caseLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("litigation");
  const fileRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchAttachments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/lawsuits/${lawsuitId}/attachments`);
      if (!response.ok) {
        setAttachments([]);
        return;
      }
      const data = (await response.json()) as { attachments: Attachment[] };
      setAttachments(data.attachments);
    } catch {
      setAttachments([]);
    } finally {
      setLoading(false);
    }
  }, [lawsuitId]);

  useEffect(() => {
    if (open) {
      fetchAttachments();
    }
  }, [open, fetchAttachments]);

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;

    setUploading(true);
    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append("files", file));

    try {
      const response = await fetch(`/api/lawsuits/${lawsuitId}/attachments`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = (await response.json().catch(() => ({}))) as { error?: string };
        toast.error(error.error ?? t("attachmentUploadError"));
        return;
      }

      toast.success(t("attachmentUploadSuccess"));
      await fetchAttachments();
      if (fileRef.current) fileRef.current.value = "";
    } catch {
      toast.error(t("attachmentUploadError"));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (attachmentId: string) => {
    setDeletingId(attachmentId);
    const result = await deleteLawsuitAttachment(attachmentId, lawsuitId);
    setDeletingId(null);

    if (result.success) {
      toast.success(t("attachmentDeleteSuccess"));
      setAttachments((current) => current.filter((item) => item.id !== attachmentId));
      return;
    }

    toast.error(result.error ?? t("attachmentDeleteError"));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{t("attachmentsVaultTitle")}</SheetTitle>
          <SheetDescription>{caseLabel}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept=".pdf,image/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) => handleUpload(e.target.files)}
            />
            <Button
              variant="secondary"
              size="sm"
              className="gap-2"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {uploading ? t("attachmentUploading") : t("attachmentUpload")}
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("attachmentsLoading")}
            </div>
          ) : attachments.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("attachmentsEmpty")}</p>
          ) : (
            <ul className="space-y-2">
              {attachments.map((attachment) => (
                <li
                  key={attachment.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {attachment.fileName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {format(new Date(attachment.uploadedAt), "yyyy-MM-dd HH:mm")}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                      <a
                        href={attachment.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={t("attachmentView")}
                      >
                        <Eye className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      disabled={deletingId === attachment.id}
                      onClick={() => handleDelete(attachment.id)}
                      aria-label={t("attachmentDelete")}
                    >
                      {deletingId === attachment.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function LawsuitAttachmentsButton({
  lawsuitId,
  caseLabel,
}: {
  lawsuitId: string;
  caseLabel: string;
}) {
  const t = useTranslations("litigation");
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="secondary" size="sm" className="gap-2" onClick={() => setOpen(true)}>
        <Paperclip className="h-4 w-4" />
        {t("attachments")}
      </Button>
      <LawsuitAttachmentsSheet
        lawsuitId={lawsuitId}
        caseLabel={caseLabel}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
