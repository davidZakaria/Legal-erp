"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FileSearch, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AnalyzeContractDialog,
  type ContractAnalysisResult,
} from "@/components/contracts/AnalyzeContractDialog";
import {
  CreateContractDialog,
  type ProjectOption,
} from "@/components/contracts/CreateContractDialog";

export function ContractsPageActions({
  projects,
  canCreate,
}: {
  projects: ProjectOption[];
  canCreate: boolean;
}) {
  const t = useTranslations("contracts");
  const [analyzeOpen, setAnalyzeOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [prefill, setPrefill] = useState<ContractAnalysisResult | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const handleAnalyzed = (result: ContractAnalysisResult, file: File) => {
    setPrefill(result);
    setUploadedFile(file);
    setAnalyzeOpen(false);
    setCreateOpen(true);
  };

  const openManualCreate = () => {
    setPrefill(null);
    setUploadedFile(null);
    setCreateOpen(true);
  };

  if (!canCreate) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        className="gap-2"
        onClick={() => setAnalyzeOpen(true)}
      >
        <FileSearch className="h-4 w-4" />
        {t("uploadAndAnalyze")}
      </Button>

      <Button className="gap-2" onClick={openManualCreate}>
        <Plus className="h-4 w-4" />
        {t("addContract")}
      </Button>

      <AnalyzeContractDialog
        open={analyzeOpen}
        onOpenChange={setAnalyzeOpen}
        onAnalyzed={handleAnalyzed}
      />

      <CreateContractDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        projects={projects}
        prefill={prefill}
        uploadedFile={uploadedFile}
      />
    </div>
  );
}
