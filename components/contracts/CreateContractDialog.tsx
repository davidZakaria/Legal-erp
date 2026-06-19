"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { FileSignature, CalendarIcon } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { createContract } from "@/app/actions/createContract";
import { useRouter } from "@/i18n/navigation";
import type { ContractAnalysisResult } from "@/components/contracts/AnalyzeContractDialog";

const schema = z.object({
  projectId: z.string().min(1),
  contractorName: z.string().min(1),
  totalValue: z.number().positive(),
  penaltyClause: z.string().min(1),
  guaranteeExpiryDate: z.date(),
});

type FormData = z.infer<typeof schema>;

export type ProjectOption = {
  id: string;
  name: string;
  location: string;
};

export function CreateContractDialog({
  open,
  onOpenChange,
  projects,
  prefill,
  uploadedFile,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: ProjectOption[];
  prefill: ContractAnalysisResult | null;
  uploadedFile: File | null;
}) {
  const t = useTranslations("contracts");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localFile, setLocalFile] = useState<File | null>(null);

  const effectiveFile = uploadedFile ?? localFile;

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (!open) {
      setLocalFile(null);
      return;
    }

    reset({
      projectId: "",
      contractorName: prefill?.contractorName ?? "",
      totalValue: prefill?.totalValue,
      penaltyClause: "",
      guaranteeExpiryDate:
        prefill?.guaranteeExpiryDate != null
          ? new Date(prefill.guaranteeExpiryDate)
          : undefined,
    });

    if (prefill) {
      setValue("contractorName", prefill.contractorName);
      setValue("totalValue", prefill.totalValue);
      if (prefill.guaranteeExpiryDate) {
        setValue("guaranteeExpiryDate", new Date(prefill.guaranteeExpiryDate));
      }
    }
  }, [open, prefill, reset, setValue]);

  const onSubmit = async (data: FormData) => {
    if (!effectiveFile) {
      setError(t("pdfRequired"));
      return;
    }

    setSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.set("projectId", data.projectId);
    formData.set("contractorName", data.contractorName);
    formData.set("totalValue", String(data.totalValue));
    formData.set("penaltyClause", data.penaltyClause);
    formData.set("guaranteeExpiryDate", data.guaranteeExpiryDate.toISOString());
    formData.set("file", effectiveFile);

    const result = await createContract(formData);
    setSubmitting(false);

    if (result.success) {
      onOpenChange(false);
      router.refresh();
      return;
    }

    setError(result.error ?? t("createError"));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto border-slate-200">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white">
              <FileSignature className="h-5 w-5" />
            </div>
            <div className="text-start">
              <DialogTitle className="text-slate-900">{t("createTitle")}</DialogTitle>
              <DialogDescription>
                {prefill ? t("createDescriptionPrefilled") : t("createDescription")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>{t("project")}</Label>
            <Controller
              name="projectId"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("selectProject")} />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name} ({project.location})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.projectId && (
              <p className="text-sm text-destructive">{errors.projectId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contractorName">{t("contractor")}</Label>
            <Input id="contractorName" {...register("contractorName")} />
            {errors.contractorName && (
              <p className="text-sm text-destructive">{errors.contractorName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="totalValue">{t("totalValue")}</Label>
            <Input
              id="totalValue"
              type="number"
              step="0.01"
              {...register("totalValue", { valueAsNumber: true })}
            />
            {errors.totalValue && (
              <p className="text-sm text-destructive">{errors.totalValue.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>{t("guaranteeExpiry")}</Label>
            <Controller
              name="guaranteeExpiryDate"
              control={control}
              render={({ field }) => (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-start font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="me-2 h-4 w-4" />
                      {field.value
                        ? format(field.value, "yyyy-MM-dd")
                        : t("guaranteeExpiry")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                    />
                  </PopoverContent>
                </Popover>
              )}
            />
            {errors.guaranteeExpiryDate && (
              <p className="text-sm text-destructive">
                {errors.guaranteeExpiryDate.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="penaltyClause">{t("penaltyClause")}</Label>
            <Textarea id="penaltyClause" rows={3} {...register("penaltyClause")} />
            {errors.penaltyClause && (
              <p className="text-sm text-destructive">{errors.penaltyClause.message}</p>
            )}
          </div>

          {effectiveFile ? (
            <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
              {t("attachedPdf")}: {effectiveFile.name}
            </p>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="contract-file">{t("uploadPdf")}</Label>
              <Input
                id="contract-file"
                type="file"
                accept=".pdf,application/pdf"
                onChange={(event) => setLocalFile(event.target.files?.[0] ?? null)}
              />
            </div>
          )}

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tCommon("cancel")}
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-slate-900 hover:bg-slate-800"
            >
              {submitting ? tCommon("loading") : t("saveToDatabase")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
