"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Plus, Scale, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
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
import { updateLawsuit } from "@/app/actions/lawsuitCrud";
import { useFormResetOnOpen } from "@/lib/hooks/useFormResetOnOpen";
import { parseIsoDate } from "@/lib/crud/parseInitialDates";
import { useRouter } from "@/i18n/navigation";
import { LAWSUIT_STATUS_VALUES } from "@/lib/litigation/constants";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import {
  LawsuitExpertsFinancialsSection,
  type ExpertsFinancialsValues,
} from "./LawsuitExpertsFinancialsSection";

const schema = z
  .object({
    caseNumber: z.string().min(1),
    year: z.number().int().min(1900).max(2100),
    courtName: z.string().min(1),
    opponentName: z.string().min(1),
    clientName: z.string().min(1),
    archiveNumber: z.string().optional(),
    registrationDate: z.date(),
    overallStatus: z.enum(["UNDER_REVIEW", "ACTIVE", "RESERVED", "COMPLETED"]),
    assignedLawyerId: z.string().min(1),
    firstSessionDate: z.date().optional(),
    firstSessionRequiredAction: z.string().optional(),
    awardedCompensation: z.number().min(0),
    judicialFees: z.number().min(0),
    isAtExperts: z.boolean(),
    expertOffice: z.string().optional(),
    expertName: z.string().optional(),
    expertFileNumber: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.isAtExperts) {
      if (!data.expertOffice?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "required",
          path: ["expertOffice"],
        });
      }
      if (!data.expertName?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "required",
          path: ["expertName"],
        });
      }
      if (!data.expertFileNumber?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "required",
          path: ["expertFileNumber"],
        });
      }
    }
  });

type FormData = z.infer<typeof schema>;

export type LawsuitFormInitialData = {
  id: string;
  caseNumber: string;
  year: number;
  courtName: string;
  opponentName: string;
  clientName: string;
  archiveNumber?: string;
  registrationDate: string | Date;
  overallStatus: "UNDER_REVIEW" | "ACTIVE" | "RESERVED" | "COMPLETED";
  assignedLawyerId: string;
  awardedCompensation: number;
  judicialFees: number;
  isAtExperts: boolean;
  expertOffice?: string;
  expertName?: string;
  expertFileNumber?: string;
  firstSessionDate?: string | Date;
  firstSessionRequiredAction?: string;
};

export type LawyerOption = {
  id: string;
  name: string;
};

export type LookupOption = { id: string; name: string };

export function CreateLawsuitDialog({
  lawyers,
  courtLookups,
  expertOfficeLookups,
  canCreate,
  initialData = null,
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
}: {
  lawyers: LawyerOption[];
  courtLookups: LookupOption[];
  expertOfficeLookups: LookupOption[];
  canCreate: boolean;
  initialData?: LawsuitFormInitialData | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}) {
  const t = useTranslations("litigation");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = Boolean(initialData?.id);

  const defaultValues = useMemo(
    () => ({
      year: new Date().getFullYear(),
      clientName: "NJD",
      registrationDate: new Date(),
      overallStatus: "UNDER_REVIEW" as const,
      archiveNumber: "",
      awardedCompensation: 0,
      judicialFees: 0,
      isAtExperts: false,
      expertOffice: "",
      expertName: "",
      expertFileNumber: "",
    }),
    []
  );

  const formInitial = useMemo(() => {
    if (!initialData) return null;
    return {
      ...initialData,
      registrationDate: parseIsoDate(initialData.registrationDate) ?? new Date(),
      firstSessionDate: parseIsoDate(initialData.firstSessionDate),
      archiveNumber: initialData.archiveNumber ?? "",
      expertOffice: initialData.expertOffice ?? "",
      expertName: initialData.expertName ?? "",
      expertFileNumber: initialData.expertFileNumber ?? "",
    };
  }, [initialData]);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = form;

  useFormResetOnOpen(form, open, formInitial, defaultValues);

  const expertsValues = watch([
    "isAtExperts",
    "expertOffice",
    "expertName",
    "expertFileNumber",
    "awardedCompensation",
    "judicialFees",
  ]);

  const expertsFinancials: ExpertsFinancialsValues = {
    isAtExperts: expertsValues[0] ?? false,
    expertOffice: expertsValues[1] ?? "",
    expertName: expertsValues[2] ?? "",
    expertFileNumber: expertsValues[3] ?? "",
    awardedCompensation: String(expertsValues[4] ?? 0),
    judicialFees: String(expertsValues[5] ?? 0),
  };

  const resetForm = () => {
    form.reset(defaultValues);
  };

  const onSubmit = async (data: FormData) => {
    if (!isEditMode && (!data.firstSessionDate || !data.firstSessionRequiredAction?.trim())) {
      setError(t("firstSessionRequired"));
      return;
    }

    setSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.set("caseNumber", data.caseNumber);
    formData.set("year", String(data.year));
    formData.set("courtName", data.courtName);
    formData.set("opponentName", data.opponentName);
    formData.set("clientName", data.clientName);
    formData.set("archiveNumber", data.archiveNumber ?? "");
    formData.set("registrationDate", data.registrationDate.toISOString());
    formData.set("overallStatus", data.overallStatus);
    formData.set("assignedLawyerId", data.assignedLawyerId);
    if (!isEditMode && data.firstSessionDate) {
      formData.set("firstSessionDate", data.firstSessionDate.toISOString());
      formData.set("firstSessionRequiredAction", data.firstSessionRequiredAction ?? "");
    }
    formData.set("awardedCompensation", String(data.awardedCompensation));
    formData.set("judicialFees", String(data.judicialFees));
    formData.set("isAtExperts", String(data.isAtExperts));
    if (data.expertOffice) formData.set("expertOffice", data.expertOffice);
    if (data.expertName) formData.set("expertName", data.expertName);
    if (data.expertFileNumber) formData.set("expertFileNumber", data.expertFileNumber);

    const result = isEditMode
      ? await updateLawsuit(initialData!.id, formData)
      : await createNewLawsuit(formData);
    setSubmitting(false);

    if (result.success) {
      toast.success(tCommon("saveSuccess"));
      resetForm();
      setOpen(false);
      router.refresh();
      return;
    }

    setError(result.error ?? t("createError"));
    toast.error(result.error ?? t("createError"));
  };

  if (!canCreate && !isEditMode) return null;

  const dialog = (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto border-slate-200">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white">
                <Scale className="h-5 w-5" />
              </div>
              <div className="text-start">
                <DialogTitle className="text-slate-900">
                  {isEditMode ? t("editLawsuitTitle") : t("createLawsuitTitle")}
                </DialogTitle>
                <DialogDescription>
                  {isEditMode ? t("editLawsuitDescription") : t("createLawsuitDescription")}
                </DialogDescription>
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

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="clientName">{t("clientName")}</Label>
                <Input id="clientName" {...register("clientName")} />
                {errors.clientName && (
                  <p className="text-sm text-destructive">{errors.clientName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="archiveNumber">{t("archiveNumber")}</Label>
                <Input id="archiveNumber" {...register("archiveNumber")} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("courtName")}</Label>
              <Controller
                name="courtName"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("selectCourt")} />
                    </SelectTrigger>
                    <SelectContent>
                      {courtLookups.map((court) => (
                        <SelectItem key={court.id} value={court.name}>
                          {court.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
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

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("registrationDate")}</Label>
                <Controller
                  name="registrationDate"
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
                            : t("registrationDate")}
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
                {errors.registrationDate && (
                  <p className="text-sm text-destructive">{errors.registrationDate.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>{t("overallStatus")}</Label>
                <Controller
                  name="overallStatus"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LAWSUIT_STATUS_VALUES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {t(`status_${status}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
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

            {!isEditMode && (
            <>
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
            </>
            )}

            <LawsuitExpertsFinancialsSection
              locale={locale}
              values={expertsFinancials}
              expertOfficeLookups={expertOfficeLookups}
              onChange={(key, value) => {
                if (key === "awardedCompensation") {
                  setValue("awardedCompensation", Number(value) || 0, { shouldValidate: true });
                } else if (key === "judicialFees") {
                  setValue("judicialFees", Number(value) || 0, { shouldValidate: true });
                } else if (key === "isAtExperts") {
                  setValue("isAtExperts", Boolean(value), { shouldValidate: true });
                } else if (key === "expertOffice") {
                  setValue("expertOffice", String(value), { shouldValidate: true });
                } else if (key === "expertName") {
                  setValue("expertName", String(value), { shouldValidate: true });
                } else if (key === "expertFileNumber") {
                  setValue("expertFileNumber", String(value), { shouldValidate: true });
                }
              }}
              errors={{
                expertOffice: errors.expertOffice ? tCommon("requiredField") : undefined,
                expertName: errors.expertName ? tCommon("requiredField") : undefined,
                expertFileNumber: errors.expertFileNumber ? tCommon("requiredField") : undefined,
              }}
            />

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
                {submitting ? tCommon("loading") : isEditMode ? tCommon("save") : t("createLawsuitSubmit")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
  );

  if (hideTrigger || isEditMode) return dialog;

  return (
    <PermissionGuard permission="LAWSUITS_CREATE">
      <>
        <Button
          className="gap-2 bg-slate-900 hover:bg-slate-800"
          onClick={() => setOpen(true)}
        >
          <Plus className="h-4 w-4" />
          {t("addNewLawsuit")}
        </Button>
        {dialog}
      </>
    </PermissionGuard>
  );
}
