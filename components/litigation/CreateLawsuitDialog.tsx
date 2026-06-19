"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Plus, Scale, CalendarIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { createNewLawsuit } from "@/app/actions/createNewLawsuit";
import { useRouter } from "@/i18n/navigation";

const schema = z.object({
  caseNumber: z.string().min(1),
  year: z.number().int().min(1900).max(2100),
  courtName: z.string().min(1),
  opponentName: z.string().min(1),
  assignedLawyerId: z.string().min(1),
  firstSessionDate: z.date(),
  firstSessionRequiredAction: z.string().min(1),
});

type FormData = z.infer<typeof schema>;

export type LawyerOption = {
  id: string;
  name: string;
};

export function CreateLawsuitDialog({
  lawyers,
  canCreate,
}: {
  lawyers: LawyerOption[];
  canCreate: boolean;
}) {
  const t = useTranslations("litigation");
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
    formData.set("courtName", data.courtName);
    formData.set("opponentName", data.opponentName);
    formData.set("assignedLawyerId", data.assignedLawyerId);
    formData.set("firstSessionDate", data.firstSessionDate.toISOString());
    formData.set("firstSessionRequiredAction", data.firstSessionRequiredAction);

    const result = await createNewLawsuit(formData);
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
        {t("addNewLawsuit")}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto border-slate-200">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white">
                <Scale className="h-5 w-5" />
              </div>
              <div className="text-start">
                <DialogTitle className="text-slate-900">{t("createLawsuitTitle")}</DialogTitle>
                <DialogDescription>{t("createLawsuitDescription")}</DialogDescription>
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
              <Label htmlFor="courtName">{t("courtName")}</Label>
              <Input id="courtName" {...register("courtName")} />
              {errors.courtName && (
                <p className="text-sm text-destructive">{errors.courtName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="opponentName">{t("opponent")}</Label>
              <Input id="opponentName" {...register("opponentName")} />
              {errors.opponentName && (
                <p className="text-sm text-destructive">{errors.opponentName.message}</p>
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

            <div className="space-y-2">
              <Label>{t("firstSessionDate")}</Label>
              <Controller
                name="firstSessionDate"
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
                          : t("firstSessionDate")}
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
              {errors.firstSessionDate && (
                <p className="text-sm text-destructive">{errors.firstSessionDate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="firstSessionRequiredAction">{t("firstSessionRequiredAction")}</Label>
              <Input
                id="firstSessionRequiredAction"
                {...register("firstSessionRequiredAction")}
              />
              {errors.firstSessionRequiredAction && (
                <p className="text-sm text-destructive">
                  {errors.firstSessionRequiredAction.message}
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
                onClick={() => setOpen(false)}
              >
                {tCommon("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-slate-900 hover:bg-slate-800"
              >
                {submitting ? tCommon("loading") : t("createLawsuitSubmit")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
