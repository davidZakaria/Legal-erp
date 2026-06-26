"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CheckCircle, CalendarIcon } from "lucide-react";
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
import { createLegalTask } from "@/app/actions/createLegalTask";
import { updateLegalTask } from "@/app/actions/taskPoaCrud";
import { useFormResetOnOpen } from "@/lib/hooks/useFormResetOnOpen";
import { parseIsoDate } from "@/lib/crud/parseInitialDates";
import { useRouter } from "@/i18n/navigation";
import type { LawyerOption } from "@/components/litigation/CreateLawsuitDialog";

const schema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  deadline: z.date(),
  assignedLawyerId: z.string().min(1),
});

type FormData = z.infer<typeof schema>;

export type LegalTaskFormInitialData = {
  id: string;
  title: string;
  description?: string | null;
  deadline: string;
  assignedLawyerId: string;
};

export function CreateLegalTaskDialog({
  lawyers,
  canCreate,
  initialData = null,
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
}: {
  lawyers: LawyerOption[];
  canCreate: boolean;
  initialData?: LegalTaskFormInitialData | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}) {
  const t = useTranslations("legalTasks");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = Boolean(initialData?.id);

  const defaultValues = useMemo(() => ({ deadline: new Date() }), []);

  const formInitial = useMemo(() => {
    if (!initialData) return null;
    return {
      title: initialData.title,
      description: initialData.description ?? "",
      deadline: parseIsoDate(initialData.deadline) ?? new Date(),
      assignedLawyerId: initialData.assignedLawyerId,
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
    formData.set("title", data.title);
    formData.set("description", data.description ?? "");
    formData.set("deadline", data.deadline.toISOString());
    formData.set("assignedLawyerId", data.assignedLawyerId);

    const result = isEditMode
      ? await updateLegalTask(initialData!.id, formData)
      : await createLegalTask(formData);

    setSubmitting(false);

    if (result.success) {
      toast.success(tCommon("saveSuccess"));
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
              <CheckCircle className="h-5 w-5" />
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
          <div className="space-y-2">
            <Label htmlFor="taskTitle">{t("title")}</Label>
            <Input id="taskTitle" {...register("title")} />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="taskDescription">{t("description")}</Label>
            <Textarea id="taskDescription" rows={3} {...register("description")} />
          </div>

          <div className="space-y-2">
            <Label>{t("deadline")}</Label>
            <Controller
              name="deadline"
              control={control}
              render={({ field }) => (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start font-normal", !field.value && "text-muted-foreground")}>
                      <CalendarIcon className="me-2 h-4 w-4" />
                      {field.value ? format(field.value, "yyyy-MM-dd") : t("deadline")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} />
                  </PopoverContent>
                </Popover>
              )}
            />
            {errors.deadline && <p className="text-sm text-destructive">{errors.deadline.message}</p>}
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
        {t("addTask")}
      </Button>
      {dialog}
    </>
  );
}
