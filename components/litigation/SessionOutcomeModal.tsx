"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Gavel, CalendarIcon } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { logSessionOutcome } from "@/app/actions/logSessionOutcome";
import { useRouter } from "@/i18n/navigation";

const schema = z
  .object({
    sessionOutcome: z.string().min(1),
    nextSessionDate: z.date().optional(),
    nextRequiredAction: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.nextSessionDate) {
        return !!data.nextRequiredAction?.trim();
      }
      return true;
    },
    {
      message: "Next required action is required",
      path: ["nextRequiredAction"],
    }
  );

type FormData = z.infer<typeof schema>;

export function SessionOutcomeModal({
  sessionId,
  open,
  onOpenChange,
}: {
  sessionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("litigation");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

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
    const formData = new FormData();
    formData.set("sessionOutcome", data.sessionOutcome);
    if (data.nextSessionDate) {
      formData.set("nextSessionDate", data.nextSessionDate.toISOString());
    }
    if (data.nextRequiredAction) {
      formData.set("nextRequiredAction", data.nextRequiredAction);
    }

    const result = await logSessionOutcome(formData, sessionId);
    setSubmitting(false);

    if (result.success) {
      reset();
      onOpenChange(false);
      router.refresh();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-slate-200">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white">
              <Gavel className="h-5 w-5" />
            </div>
            <div className="text-start">
              <DialogTitle className="text-slate-900">{t("logOutcome")}</DialogTitle>
              <DialogDescription>{t("sessionOutcomeDescription")}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sessionOutcome">{t("sessionOutcome")}</Label>
            <Textarea
              id="sessionOutcome"
              {...register("sessionOutcome")}
              rows={4}
              className="resize-none"
              placeholder={t("sessionOutcomePlaceholder")}
            />
            {errors.sessionOutcome && (
              <p className="text-sm text-destructive">
                {errors.sessionOutcome.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>{t("nextSessionDate")}</Label>
            <Controller
              name="nextSessionDate"
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
                        : t("nextSessionDate")}
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="nextRequiredAction">{t("nextRequiredAction")}</Label>
            <Input id="nextRequiredAction" {...register("nextRequiredAction")} />
            {errors.nextRequiredAction && (
              <p className="text-sm text-destructive">
                {errors.nextRequiredAction.message}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={submitting} className="bg-slate-900 hover:bg-slate-800">
              {submitting ? tCommon("loading") : tCommon("save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
