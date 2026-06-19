"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { FileSearch, Upload } from "lucide-react";
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

export type ContractAnalysisResult = {
  contractorName: string;
  totalValue: number;
  guaranteeExpiryDate: string | null;
};

export function AnalyzeContractDialog({
  open,
  onOpenChange,
  onAnalyzed,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAnalyzed: (result: ContractAnalysisResult, file: File) => void;
}) {
  const t = useTranslations("contracts");
  const tCommon = useTranslations("common");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetState = () => {
    setSelectedFile(null);
    setError(null);
    setAnalyzing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetState();
    }
    onOpenChange(nextOpen);
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setError(t("pdfRequired"));
      return;
    }

    setAnalyzing(true);
    setError(null);
    toast.info(t("analyzingContract"));

    try {
      const formData = new FormData();
      formData.set("file", selectedFile);

      const response = await fetch("/api/contracts/analyze", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError((payload as { error?: string }).error ?? t("analyzeError"));
        return;
      }

      onAnalyzed(payload as ContractAnalysisResult, selectedFile);
      resetState();
      toast.success(t("analyzeSuccess"));
    } catch {
      setError(t("analyzeError"));
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg border-slate-200">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white">
              <FileSearch className="h-5 w-5" />
            </div>
            <div className="text-start">
              <DialogTitle className="text-slate-900">{t("analyzeTitle")}</DialogTitle>
              <DialogDescription>{t("analyzeDescription")}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contract-pdf">{t("uploadPdf")}</Label>
            <div className="flex items-center gap-3">
              <Input
                id="contract-pdf"
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setSelectedFile(file);
                  setError(null);
                }}
              />
            </div>
            {selectedFile && (
              <p className="text-sm text-slate-500">
                {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
              </p>
            )}
          </div>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={analyzing}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              type="button"
              className="gap-2 bg-slate-900 hover:bg-slate-800"
              onClick={handleAnalyze}
              disabled={analyzing || !selectedFile}
            >
              <Upload className="h-4 w-4" />
              {analyzing ? t("analyzingContract") : t("analyzeSubmit")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
