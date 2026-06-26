"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Plus, CalendarIcon } from "lucide-react";
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { createExpertSession } from "@/app/actions/createExpertSession";
import { useRouter } from "@/i18n/navigation";

const schema = z.object({
  sessionDate: z.date(),
  requiredAction: z.string().min(1),
});

type FormData = z.infer<typeof schema>;

export function AddExpertSessionDialog({
  lawsuitId,
  caseLabel,
  canManage,
}: {
  lawsuitId: string;
  caseLabel: string;
  canManage: boolean;
}) {
  const t = useTranslations("experts");
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
  });

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.set("lawsuitId", lawsuitId);
    formData.set("sessionDate", data.sessionDate.toISOString());
    formData.set("requiredAction", data.requiredAction);

    const result = await createExpertSession(formData);
    setSubmitting(false);

    if (result.success) {
      reset();
      setOpen(false);
      router.refresh();
      return;
    }

    setError(result.error ?? t("addSessionError"));
  };

  if (!canManage) return null;

  return (
    <>
      <Button
        size="sm"
        className="gap-2 bg-purple-900 hover:bg-purple-800"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-4 w-4" />
        {t("addExpertSession")}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md border-slate-200">
          <DialogHeader>
            <DialogTitle>{t("addExpertSessionTitle")}</DialogTitle>
            <DialogDescription>{caseLabel}</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>{t("sessionDate")}</Label>
              <Controller
                name="sessionDate"
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
                        {field.value ? format(field.value, "yyyy-MM-dd") : t("sessionDate")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={field.value} onSelect={field.onChange} />
                    </PopoverContent>
                  </Popover>
                )}
              />
              {errors.sessionDate && (
                <p className="text-sm text-destructive">{errors.sessionDate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="requiredAction">{t("requiredAction")}</Label>
              <Input id="requiredAction" {...register("requiredAction")} />
              {errors.requiredAction && (
                <p className="text-sm text-destructive">{errors.requiredAction.message}</p>
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
                className="bg-purple-900 hover:bg-purple-800"
              >
                {submitting ? tCommon("loading") : t("addSessionSubmit")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
