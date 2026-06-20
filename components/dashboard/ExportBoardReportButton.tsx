"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ExportBoardReportButton({ canExport }: { canExport: boolean }) {
  const t = useTranslations("dashboard");
  const [loading, setLoading] = useState(false);

  if (!canExport) return null;

  const handleExport = async () => {
    setLoading(true);
    const toastId = toast.loading(t("exportLoading"));

    try {
      const response = await fetch("/api/export");
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        toast.error((error as { error?: string }).error ?? t("exportError"), {
          id: toastId,
        });
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "NJD_Executive_Report.xlsx";
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(url);
      toast.success(t("exportSuccess"), { id: toastId });
    } catch {
      toast.error(t("exportError"), { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      className="gap-2"
      onClick={handleExport}
      disabled={loading}
    >
      <Download className="h-4 w-4" />
      {loading ? t("exportLoading") : t("exportBoardReport")}
    </Button>
  );
}
