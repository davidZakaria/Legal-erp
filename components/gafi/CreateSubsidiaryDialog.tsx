"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Plus, Building2, CalendarIcon } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { createSubsidiaryCompany } from "@/app/actions/createSubsidiaryCompany";
import { updateSubsidiaryCompany } from "@/app/actions/gafiCrud";
import { useFormResetOnOpen } from "@/lib/hooks/useFormResetOnOpen";
import { parseIsoDate } from "@/lib/crud/parseInitialDates";
import { useRouter } from "@/i18n/navigation";

const schema = z.object({
  name: z.string().min(1),
  commercialRegister: z.string().optional(),
  crExpiryDate: z.date().optional(),
  taxCard: z.string().optional(),
  taxCardExpiryDate: z.date().optional(),
  boardExpiryDate: z.date().optional(),
  capitalPaidDetails: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export type SubsidiaryFormInitialData = {
  id: string;
  name: string;
  commercialRegister?: string | null;
  crExpiryDate?: string | null;
  taxCard?: string | null;
  taxCardExpiryDate?: string | null;
  boardExpiryDate?: string | null;
  capitalPaidDetails?: string | null;
};

function OptionalDateField({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value?: Date;
  onChange: (date?: Date) => void;
  error?: string;
}) {
  const t = useTranslations("gafi");

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-full justify-start text-start font-normal",
              !value && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="me-2 h-4 w-4" />
            {value ? format(value, "yyyy-MM-dd") : t("selectDate")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={value} onSelect={onChange} />
        </PopoverContent>
      </Popover>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

export function CreateSubsidiaryDialog({
  canCreate,
  initialData = null,
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
}: {
  canCreate: boolean;
  initialData?: SubsidiaryFormInitialData | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}) {
  const t = useTranslations("gafi");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = Boolean(initialData?.id);

  const defaultValues = useMemo(() => ({}), []);

  const formInitial = useMemo(() => {
    if (!initialData) return null;
    return {
      name: initialData.name,
      commercialRegister: initialData.commercialRegister ?? "",
      crExpiryDate: parseIsoDate(initialData.crExpiryDate),
      taxCard: initialData.taxCard ?? "",
      taxCardExpiryDate: parseIsoDate(initialData.taxCardExpiryDate),
      boardExpiryDate: parseIsoDate(initialData.boardExpiryDate),
      capitalPaidDetails: initialData.capitalPaidDetails ?? "",
    };
  }, [initialData]);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const { register, handleSubmit, control } = form;

  useFormResetOnOpen(form, open, formInitial, defaultValues);

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.set("name", data.name);
    if (data.commercialRegister) formData.set("commercialRegister", data.commercialRegister);
    if (data.crExpiryDate) formData.set("crExpiryDate", data.crExpiryDate.toISOString());
    if (data.taxCard) formData.set("taxCard", data.taxCard);
    if (data.taxCardExpiryDate) {
      formData.set("taxCardExpiryDate", data.taxCardExpiryDate.toISOString());
    }
    if (data.boardExpiryDate) formData.set("boardExpiryDate", data.boardExpiryDate.toISOString());
    if (data.capitalPaidDetails) formData.set("capitalPaidDetails", data.capitalPaidDetails);

    const result = isEditMode
      ? await updateSubsidiaryCompany(initialData!.id, formData)
      : await createSubsidiaryCompany(formData);

    setSubmitting(false);

    if (result.success) {
      toast.success(tCommon("saveSuccess"));
      setOpen(false);
      router.refresh();
      return;
    }

    setError(result.error ?? t("createCompanyError"));
    toast.error(result.error ?? t("createCompanyError"));
  };

  if (!canCreate && !isEditMode) return null;

  const dialog = (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto border-border">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="text-start">
              <DialogTitle className="text-foreground">
                {isEditMode ? t("editCompanyTitle") : t("createCompanyTitle")}
              </DialogTitle>
              <DialogDescription>
                {isEditMode ? t("editCompanyDescription") : t("createCompanyDescription")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("companyName")}</Label>
            <Input id="name" {...register("name")} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="commercialRegister">{t("commercialRegister")}</Label>
              <Input id="commercialRegister" {...register("commercialRegister")} />
            </div>
            <Controller
              name="crExpiryDate"
              control={control}
              render={({ field }) => (
                <OptionalDateField
                  label={t("crExpiryDate")}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="taxCard">{t("taxCard")}</Label>
              <Input id="taxCard" {...register("taxCard")} />
            </div>
            <Controller
              name="taxCardExpiryDate"
              control={control}
              render={({ field }) => (
                <OptionalDateField
                  label={t("taxCardExpiryDate")}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </div>

          <Controller
            name="boardExpiryDate"
            control={control}
            render={({ field }) => (
              <OptionalDateField
                label={t("boardExpiryDate")}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />

          <div className="space-y-2">
            <Label htmlFor="capitalPaidDetails">{t("capitalPaidDetails")}</Label>
            <Input
              id="capitalPaidDetails"
              placeholder={t("capitalPaidPlaceholder")}
              {...register("capitalPaidDetails")}
            />
          </div>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button
              type="submit"
              disabled={submitting}
             
            >
              {submitting ? tCommon("loading") : isEditMode ? tCommon("save") : t("createCompanySubmit")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );

  if (hideTrigger || isEditMode) return dialog;

  return (
    <>
      <Button
        className="gap-2"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-4 w-4" />
        {t("addCompany")}
      </Button>
      {dialog}
    </>
  );
}
