"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, RefreshCw } from "lucide-react";
import { LegalNoticeDeliveryStatus } from "@prisma/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { updateLegalNoticeDelivery } from "@/app/actions/updateLegalNoticeDelivery";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { LegalNoticeRow } from "@/components/notices/NoticesDataTable";

const schema = z
  .object({
    deliveryStatus: z.nativeEnum(LegalNoticeDeliveryStatus),
    deliveryDate: z.date().optional(),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.deliveryStatus !== LegalNoticeDeliveryStatus.PENDING && !data.deliveryDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "required",
        path: ["deliveryDate"],
      });
    }
  });

type FormData = z.infer<typeof schema>;

export function UpdateDeliveryDialog({
  notice,
  open,
  onOpenChange,
}: {
  notice: LegalNoticeRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("notices");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      deliveryStatus: LegalNoticeDeliveryStatus.PENDING,
    },
  });

  const { handleSubmit, control, reset, watch, formState: { errors } } = form;
  const deliveryStatus = watch("deliveryStatus");

  useEffect(() => {
    if (!open || !notice) return;
    reset({
      deliveryStatus: notice.deliveryStatus,
      deliveryDate: notice.deliveryDate ? new Date(notice.deliveryDate) : new Date(),
      notes: "",
    });
  }, [open, notice, reset]);

  const onSubmit = async (data: FormData) => {
    if (!notice) return;

    setSubmitting(true);
    const formData = new FormData();
    formData.set("deliveryStatus", data.deliveryStatus);
    if (data.deliveryDate) {
      formData.set("deliveryDate", data.deliveryDate.toISOString());
    }
    if (data.notes) formData.set("notes", data.notes);

    const result = await updateLegalNoticeDelivery(notice.id, formData);
    setSubmitting(false);

    if (result.success) {
      toast.success(t("deliveryUpdateSuccess"));
      onOpenChange(false);
      router.refresh();
      return;
    }

    toast.error(result.error ?? t("deliveryUpdateError"));
  };

  if (!notice) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-amber-600" />
            {t("updateDeliveryTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("updateDeliveryDescription", { opponent: notice.opponentName })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>{t("deliveryStatus")}</Label>
            <Controller
              name="deliveryStatus"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(LegalNoticeDeliveryStatus).map((status) => (
                      <SelectItem key={status} value={status}>
                        {t(`deliveryStatus_${status}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {deliveryStatus !== LegalNoticeDeliveryStatus.PENDING && (
            <div className="space-y-2">
              <Label>{t("deliveryDate")}</Label>
              <Controller
                name="deliveryDate"
                control={control}
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "w-full justify-start font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="me-2 h-4 w-4" />
                        {field.value ? format(field.value, "yyyy-MM-dd") : t("deliveryDate")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={field.value} onSelect={field.onChange} />
                    </PopoverContent>
                  </Popover>
                )}
              />
              {errors.deliveryDate && (
                <p className="text-sm text-destructive">{t("deliveryDateRequired")}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="deliveryNotes">{t("deliveryNotes")}</Label>
            <Textarea id="deliveryNotes" rows={3} {...form.register("notes")} />
          </div>

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={submitting} className="bg-amber-600 hover:bg-amber-700">
              {submitting ? tCommon("loading") : t("updateDeliverySubmit")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
