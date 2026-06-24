"use client";

import { useTranslations } from "next-intl";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  exportLawsuitsToExcel,
  type LawsuitExportRow,
} from "@/lib/litigation/exportLawsuits";

export function ExportFilteredLawsuitsButton({
  lawsuits,
}: {
  lawsuits: LawsuitExportRow[];
}) {
  const t = useTranslations("litigation");

  const handleExport = () => {
    if (!lawsuits.length) {
      toast.error(t("exportFilteredEmpty"));
      return;
    }

    try {
      exportLawsuitsToExcel(lawsuits, "NJD_Lawsuits_Filtered.xlsx");
      toast.success(t("exportFilteredSuccess", { count: lawsuits.length }));
    } catch {
      toast.error(t("exportFilteredError"));
    }
  };

  return (
    <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
      <Download className="h-4 w-4" />
      {t("exportFiltered")}
    </Button>
  );
}
