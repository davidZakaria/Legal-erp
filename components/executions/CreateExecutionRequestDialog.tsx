"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Shield } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createExecutionRequest } from "@/app/actions/createExecutionRequest";
import { useRouter } from "@/i18n/navigation";
import type { LawyerOption } from "@/components/litigation/CreateLawsuitDialog";

const EXECUTION_TYPES = ["إخلاء", "حجز", "بيع بالمزاد"] as const;

const schema = z.object({
  lawsuitId: z.string().min(1),
  executionType: z.enum(EXECUTION_TYPES),
  assignedLawyerId: z.string().min(1),
});

type FormData = z.infer<typeof schema>;

export type LawsuitOption = {
  id: string;
  label: string;
};

export function CreateExecutionRequestDialog({
  lawyers,
  lawsuits,
  canCreate,
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
}: {
  lawyers: LawyerOption[];
  lawsuits: LawsuitOption[];
  canCreate: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}) {
  const t = useTranslations("executions");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { handleSubmit, control, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    setError(null);
    const formData = new FormData();
    formData.set("lawsuitId", data.lawsuitId);
    formData.set("executionType", data.executionType);
    formData.set("assignedLawyerId", data.assignedLawyerId);

    const result = await createExecutionRequest(formData);
    setSubmitting(false);

    if (result.success) {
      reset();
      setOpen(false);
      router.refresh();
      return;
    }
    setError(result.error ?? t("createError"));
  };

  if (!canCreate) return null;

  return (
    <>
      {!hideTrigger && (
        <Button className="gap-2 bg-slate-900 hover:bg-slate-800" onClick={() => setOpen(true)}>
          {t("addExecution")}
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg border-slate-200">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white">
                <Shield className="h-5 w-5" />
              </div>
              <div className="text-start">
                <DialogTitle>{t("createTitle")}</DialogTitle>
                <DialogDescription>{t("createDescription")}</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>{t("lawsuit")}</Label>
              <Controller
                name="lawsuitId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger><SelectValue placeholder={t("selectLawsuit")} /></SelectTrigger>
                    <SelectContent>
                      {lawsuits.map((lawsuit) => (
                        <SelectItem key={lawsuit.id} value={lawsuit.id}>{lawsuit.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.lawsuitId && <p className="text-sm text-destructive">{errors.lawsuitId.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>{t("executionType")}</Label>
              <Controller
                name="executionType"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger><SelectValue placeholder={t("selectType")} /></SelectTrigger>
                    <SelectContent>
                      {EXECUTION_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.executionType && <p className="text-sm text-destructive">{errors.executionType.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>{t("assignedLawyer")}</Label>
              <Controller
                name="assignedLawyerId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger><SelectValue placeholder={t("selectLawyer")} /></SelectTrigger>
                    <SelectContent>
                      {lawyers.map((lawyer) => (
                        <SelectItem key={lawyer.id} value={lawyer.id}>{lawyer.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.assignedLawyerId && <p className="text-sm text-destructive">{errors.assignedLawyerId.message}</p>}
            </div>

            {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>{tCommon("cancel")}</Button>
              <Button type="submit" disabled={submitting} className="bg-slate-900 hover:bg-slate-800">
                {submitting ? tCommon("loading") : t("createSubmit")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
