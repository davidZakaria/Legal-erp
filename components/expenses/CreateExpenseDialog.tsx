"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Plus, Wallet, CalendarIcon } from "lucide-react";
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
import { createExpense } from "@/app/actions/createExpense";
import { updateExpense } from "@/app/actions/expenseCrud";
import { useFormResetOnOpen } from "@/lib/hooks/useFormResetOnOpen";
import { parseIsoDate } from "@/lib/crud/parseInitialDates";
import { useRouter } from "@/i18n/navigation";

const NONE = "__none__";

const schema = z.object({
  amount: z.number().positive(),
  description: z.string().min(1),
  date: z.date(),
  lawsuitId: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export type ExpenseFormInitialData = {
  id: string;
  amount: number;
  description: string;
  date: string;
  lawsuitId?: string | null;
};

export type LawsuitOption = { id: string; label: string };

export function CreateExpenseDialog({
  lawsuits,
  canCreate,
  initialData = null,
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
}: {
  lawsuits: LawsuitOption[];
  canCreate: boolean;
  initialData?: ExpenseFormInitialData | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}) {
  const t = useTranslations("expenses");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const isEditMode = Boolean(initialData?.id);

  const defaultValues = useMemo(() => ({ date: new Date() }), []);

  const formInitial = useMemo(() => {
    if (!initialData) return null;
    return {
      amount: initialData.amount,
      description: initialData.description,
      date: parseIsoDate(initialData.date) ?? new Date(),
      lawsuitId: initialData.lawsuitId ?? NONE,
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
    formState: { errors },
  } = form;

  useFormResetOnOpen(form, open, formInitial, defaultValues);

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.set("amount", String(data.amount));
    formData.set("description", data.description);
    formData.set("date", data.date.toISOString());
    if (data.lawsuitId && data.lawsuitId !== NONE) {
      formData.set("lawsuitId", data.lawsuitId);
    }
    if (receiptFile) formData.set("receipt", receiptFile);

    const result = isEditMode
      ? await updateExpense(initialData!.id, formData)
      : await createExpense(formData);

    setSubmitting(false);

    if (result.success) {
      toast.success(tCommon("saveSuccess"));
      setReceiptFile(null);
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
      <DialogContent className="max-w-lg border-slate-200">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white">
              <Wallet className="h-5 w-5" />
            </div>
            <div className="text-start">
              <DialogTitle>{isEditMode ? t("editTitle") : t("createTitle")}</DialogTitle>
              <DialogDescription>
                {isEditMode ? t("editDescription") : t("createDescription")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="amount">{t("amount")}</Label>
              <Input id="amount" type="number" step="0.01" {...register("amount", { valueAsNumber: true })} />
              {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>{t("date")}</Label>
              <Controller
                name="date"
                control={control}
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start font-normal", !field.value && "text-muted-foreground")}>
                        <CalendarIcon className="me-2 h-4 w-4" />
                        {field.value ? format(field.value, "yyyy-MM-dd") : t("date")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={field.value} onSelect={field.onChange} />
                    </PopoverContent>
                  </Popover>
                )}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t("description")}</Label>
            <Input id="description" {...register("description")} />
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>{t("linkedLawsuit")}</Label>
            <Controller
              name="lawsuitId"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value ?? NONE}>
                  <SelectTrigger><SelectValue placeholder={t("selectLawsuit")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>{t("noLawsuit")}</SelectItem>
                    {lawsuits.map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="receipt">{t("receipt")}{isEditMode ? ` (${tCommon("optional")})` : ""}</Label>
            <Input
              id="receipt"
              type="file"
              accept=".pdf,image/*"
              onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{tCommon("cancel")}</Button>
            <Button type="submit" disabled={submitting} className="bg-slate-900 hover:bg-slate-800">
              {submitting ? tCommon("loading") : isEditMode ? tCommon("save") : t("createSubmit")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );

  if (hideTrigger || isEditMode) return dialog;

  return (
    <>
      <Button className="gap-2 bg-slate-900 hover:bg-slate-800" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        {t("requestExpense")}
      </Button>
      {dialog}
    </>
  );
}
