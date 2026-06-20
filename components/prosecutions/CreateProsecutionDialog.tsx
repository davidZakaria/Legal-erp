"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, ShieldAlert } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createProsecution } from "@/app/actions/createProsecution";
import { PROSECUTION_ISSUE_TYPES } from "@/lib/prosecutions/constants";
import { useRouter } from "@/i18n/navigation";

const schema = z.object({
  caseNumber: z.string().min(1),
  year: z.number().int().min(1900).max(2100),
  policeStation: z.string().min(1),
  clientName: z.string().min(1),
  issueType: z.enum(PROSECUTION_ISSUE_TYPES),
  assignedLawyerId: z.string().min(1),
});

type FormData = z.infer<typeof schema>;

export type LawyerOption = {
  id: string;
  name: string;
};

export function CreateProsecutionDialog({
  lawyers,
  canCreate,
}: {
  lawyers: LawyerOption[];
  canCreate: boolean;
}) {
  const t = useTranslations("prosecutions");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      year: new Date().getFullYear(),
    },
  });

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.set("caseNumber", data.caseNumber);
    formData.set("year", String(data.year));
    formData.set("policeStation", data.policeStation);
    formData.set("clientName", data.clientName);
    formData.set("issueType", data.issueType);
    formData.set("assignedLawyerId", data.assignedLawyerId);

    const result = await createProsecution(formData);
    setSubmitting(false);

    if (result.success) {
      reset({ year: new Date().getFullYear() });
      setOpen(false);
      router.refresh();
      return;
    }

    setError(result.error ?? t("createError"));
  };

  if (!canCreate) return null;

  return (
    <>
      <Button
        className="gap-2 bg-slate-900 hover:bg-slate-800"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-4 w-4" />
        {t("addProsecution")}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto border-slate-200">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div className="text-start">
                <DialogTitle className="text-slate-900">{t("createTitle")}</DialogTitle>
                <DialogDescription>{t("createDescription")}</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="caseNumber">{t("caseNumber")}</Label>
                <Input id="caseNumber" {...register("caseNumber")} />
                {errors.caseNumber && (
                  <p className="text-sm text-destructive">{errors.caseNumber.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="year">{t("year")}</Label>
                <Input id="year" type="number" {...register("year", { valueAsNumber: true })} />
                {errors.year && (
                  <p className="text-sm text-destructive">{errors.year.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="policeStation">{t("policeStation")}</Label>
              <Input id="policeStation" {...register("policeStation")} />
              {errors.policeStation && (
                <p className="text-sm text-destructive">{errors.policeStation.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientName">{t("clientName")}</Label>
              <Input id="clientName" {...register("clientName")} />
              {errors.clientName && (
                <p className="text-sm text-destructive">{errors.clientName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t("issueType")}</Label>
              <Controller
                name="issueType"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("selectIssueType")} />
                    </SelectTrigger>
                    <SelectContent>
                      {PROSECUTION_ISSUE_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.issueType && (
                <p className="text-sm text-destructive">{errors.issueType.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t("assignedLawyer")}</Label>
              <Controller
                name="assignedLawyerId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("selectLawyer")} />
                    </SelectTrigger>
                    <SelectContent>
                      {lawyers.map((lawyer) => (
                        <SelectItem key={lawyer.id} value={lawyer.id}>
                          {lawyer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.assignedLawyerId && (
                <p className="text-sm text-destructive">{errors.assignedLawyerId.message}</p>
              )}
            </div>

            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {tCommon("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-slate-900 hover:bg-slate-800"
              >
                {submitting ? tCommon("loading") : t("createSubmit")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
