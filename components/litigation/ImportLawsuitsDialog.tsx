"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { read, utils } from "xlsx";
import { Upload } from "lucide-react";
import { toast } from "sonner";
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
import { bulkInsertLawsuits } from "@/app/actions/bulkInsertLawsuits";
import type { BulkLawsuitRow } from "@/lib/litigation/constants";
import { useRouter } from "@/i18n/navigation";

const HEADER_MAP: Record<string, keyof BulkLawsuitRow> = {
  "رقم الدعوى": "caseNumber",
  "case number": "caseNumber",
  casenumber: "caseNumber",
  السنة: "year",
  year: "year",
  المحكمة: "courtName",
  "اسم المحكمة": "courtName",
  court: "courtName",
  courtname: "courtName",
  الخصم: "opponentName",
  "اسم الخصم": "opponentName",
  opponent: "opponentName",
  opponentname: "opponentName",
  "بريد المحامي": "assignedLawyerEmail",
  "assigned lawyer email": "assignedLawyerEmail",
  lawyeremail: "assignedLawyerEmail",
  email: "assignedLawyerEmail",
};

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase();
}

function mapRow(raw: Record<string, unknown>): BulkLawsuitRow | null {
  const mapped: Partial<BulkLawsuitRow> = {};

  for (const [key, value] of Object.entries(raw)) {
    const field = HEADER_MAP[normalizeHeader(key)];
    if (!field) continue;
    if (field === "year") {
      mapped.year = Number(value);
    } else {
      mapped[field] = String(value ?? "").trim();
    }
  }

  if (
    !mapped.caseNumber ||
    !mapped.year ||
    !mapped.courtName ||
    !mapped.opponentName ||
    !mapped.assignedLawyerEmail
  ) {
    return null;
  }

  return mapped as BulkLawsuitRow;
}

export function ImportLawsuitsDialog({ canImport }: { canImport: boolean }) {
  const t = useTranslations("litigation");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedCount, setParsedCount] = useState(0);
  const [rows, setRows] = useState<BulkLawsuitRow[]>([]);

  const resetState = () => {
    setFileName(null);
    setParsedCount(0);
    setRows([]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) resetState();
    setOpen(next);
  };

  const handleFileChange = async (file: File | null) => {
    if (!file) {
      resetState();
      return;
    }

    setFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = utils.sheet_to_json<Record<string, unknown>>(sheet);

      const parsed = json.map(mapRow).filter((row): row is BulkLawsuitRow => row !== null);

      setRows(parsed);
      setParsedCount(parsed.length);

      if (!parsed.length) {
        toast.error(t("importParseError"));
      }
    } catch {
      resetState();
      toast.error(t("importParseError"));
    }
  };

  const handleImport = async () => {
    if (!rows.length) {
      toast.error(t("importNoRows"));
      return;
    }

    setImporting(true);
    const result = await bulkInsertLawsuits(rows);
    setImporting(false);

    if (result.success) {
      toast.success(t("importSuccess", { count: result.imported ?? 0 }));
      handleOpenChange(false);
      router.refresh();
      return;
    }

    toast.error(result.error ?? t("importError"));
  };

  if (!canImport) return null;

  return (
    <>
      <Button variant="outline" className="gap-2" onClick={() => setOpen(true)}>
        <Upload className="h-4 w-4" />
        {t("importCases")}
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-lg border-border">
          <DialogHeader>
            <DialogTitle>{t("importTitle")}</DialogTitle>
            <DialogDescription>{t("importDescription")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lawsuit-import-file">{t("importFileLabel")}</Label>
              <Input
                id="lawsuit-import-file"
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
              />
              {fileName && (
                <p className="text-sm text-muted-foreground">
                  {fileName}
                  {parsedCount > 0 && ` — ${t("importRowCount", { count: parsedCount })}`}
                </p>
              )}
            </div>

            <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
              {t("importColumnsHint")}
            </div>

            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                {tCommon("cancel")}
              </Button>
              <Button
                onClick={handleImport}
                disabled={importing || !rows.length}
               
              >
                {importing ? t("importing") : t("importSubmit")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
