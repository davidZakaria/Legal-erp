"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Plus, CalendarIcon, FileArchive } from "lucide-react";
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
import { createAssemblyArchive } from "@/app/actions/createAssemblyArchive";
import { updateAssemblyArchive } from "@/app/actions/gafiCrud";
import { useFormResetOnOpen } from "@/lib/hooks/useFormResetOnOpen";
import { parseIsoDate } from "@/lib/crud/parseInitialDates";
import { useRouter } from "@/i18n/navigation";
import type { SubsidiaryCompanyRow } from "./SubsidiaryRegistryTable";

const ASSEMBLY_TYPES = ["ORDINARY", "EXTRAORDINARY"] as const;

const schema = z.object({
  companyId: z.string().min(1),
  type: z.enum(ASSEMBLY_TYPES),
  dateHeld: z.date(),
});

type FormData = z.infer<typeof schema>;

export type AssemblyArchiveFormInitialData = {
  id: string;
  companyId: string;
  type: (typeof ASSEMBLY_TYPES)[number];
  dateHeld: string;
};

export function CreateAssemblyArchiveDialog({
  canCreate,
  canUpdate = false,
  companies,
  initialData = null,
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
}: {
  canCreate: boolean;
  canUpdate?: boolean;
  companies: SubsidiaryCompanyRow[];
  initialData?: AssemblyArchiveFormInitialData | null;
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
  const [file, setFile] = useState<File | null>(null);

  const isEditMode = Boolean(initialData?.id);

  const defaultValues = useMemo(() => ({}), []);

  const formInitial = useMemo(() => {
    if (!initialData) return null;
    return {
      companyId: initialData.companyId,
      type: initialData.type,
      dateHeld: parseIsoDate(initialData.dateHeld) ?? new Date(),
    };
  }, [initialData]);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const { handleSubmit, control } = form;

  useFormResetOnOpen(form, open, formInitial, defaultValues);

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.set("companyId", data.companyId);
    formData.set("type", data.type);
    formData.set("dateHeld", data.dateHeld.toISOString());
    if (file) formData.set("file", file);

    const result = isEditMode
      ? await updateAssemblyArchive(initialData!.id, formData)
      : await createAssemblyArchive(formData);

    setSubmitting(false);

    if (result.success) {
      toast.success(tCommon("saveSuccess"));
      setFile(null);
      setOpen(false);
      router.refresh();
      return;
    }

    setError(result.error ?? t("createAssemblyError"));
    toast.error(result.error ?? t("createAssemblyError"));
  };

  if (!isEditMode && !canCreate) return null;
  if (isEditMode && !canUpdate) return null;

  const dialog = (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto border-border">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <FileArchive className="h-5 w-5" />
            </div>
            <div className="text-start">
              <DialogTitle className="text-foreground">
                {isEditMode ? t("editAssemblyTitle") : t("createAssemblyTitle")}
              </DialogTitle>
              <DialogDescription>
                {isEditMode ? t("editAssemblyDescription") : t("createAssemblyDescription")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>{t("companyName")}</Label>
            <Controller
              name="companyId"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("selectCompany")} />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("assemblyType")}</Label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("selectAssemblyType")} />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSEMBLY_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {t(`assemblyType_${type}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("assemblyDateHeld")}</Label>
            <Controller
              name="dateHeld"
              control={control}
              render={({ field }) => (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-start font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="me-2 h-4 w-4" />
                      {field.value
                        ? format(field.value, "yyyy-MM-dd")
                        : t("selectDate")}
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="assemblyFile">
              {t("assemblyFile")}
              {isEditMode ? ` (${tCommon("optional")})` : ""}
            </Label>
            <Input
              id="assemblyFile"
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
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
              {submitting ? tCommon("loading") : isEditMode ? tCommon("save") : t("createAssemblySubmit")}
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
        disabled={companies.length === 0}
      >
        <Plus className="h-4 w-4" />
        {t("addAssemblyArchive")}
      </Button>
      {dialog}
    </>
  );
}
