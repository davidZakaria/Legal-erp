"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Plus, Building2, CalendarIcon } from "lucide-react";
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
import { getLegalLabel } from "@/lib/legal-labels";
import { createGafiTask } from "@/app/actions/createGafiTask";
import { useRouter } from "@/i18n/navigation";

const TASK_TYPES = ["ASSEMBLY", "TRADEMARK"] as const;

const schema = z.object({
  title: z.string().min(1),
  taskType: z.enum(TASK_TYPES),
  deadline: z.date(),
});

type FormData = z.infer<typeof schema>;

export function CreateGafiTaskDialog({
  canCreate,
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
}: {
  canCreate: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}) {
  const t = useTranslations("gafi");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
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
  });

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.set("title", data.title);
    formData.set("taskType", data.taskType);
    formData.set("deadline", data.deadline.toISOString());

    const result = await createGafiTask(formData);
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
      <Button
        className="gap-2"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-4 w-4" />
        {t("addCorporateTask")}
      </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg border-border">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="text-start">
                <DialogTitle className="text-foreground">{t("createTaskTitle")}</DialogTitle>
                <DialogDescription>{t("createTaskDescription")}</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">{t("taskTitle")}</Label>
              <Input id="title" {...register("title")} />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t("taskType")}</Label>
              <Controller
                name="taskType"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("selectTaskType")} />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {getLegalLabel("gafiTaskType", type, locale).label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.taskType && (
                <p className="text-sm text-destructive">{errors.taskType.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t("deadline")}</Label>
              <Controller
                name="deadline"
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
                          : t("deadline")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                )}
              />
              {errors.deadline && (
                <p className="text-sm text-destructive">{errors.deadline.message}</p>
              )}
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
                {submitting ? tCommon("loading") : t("createTaskSubmit")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
