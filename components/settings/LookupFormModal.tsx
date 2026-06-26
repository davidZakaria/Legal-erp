"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  name: z.string().trim().min(2, "minLength"),
});

type FormValues = z.infer<typeof schema>;

export type LookupFormData = { id: string; name: string };

export type LookupSubmitResult = { success: true } | { success: false; error?: string };

type LookupFormModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialData: LookupFormData | null;
  title: string;
  onSubmit: (values: { name: string }) => Promise<LookupSubmitResult>;
};

export function LookupFormModal({
  isOpen,
  onClose,
  initialData,
  title,
  onSubmit,
}: LookupFormModalProps) {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "" },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = form;

  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      reset({ name: initialData.name });
    } else {
      reset({ name: "" });
    }
  }, [initialData, form, isOpen, reset]);

  const onFormSubmit = handleSubmit(async (values) => {
    setIsSubmitting(true);
    try {
      await onSubmit({ name: values.name.trim() });
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isSubmitting) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onFormSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lookup-name">{t("lookupName")}</Label>
            <Input
              id="lookup-name"
              autoFocus
              disabled={isSubmitting}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-destructive">
                {errors.name.message === "minLength"
                  ? t("lookupNameMinLength")
                  : t("lookupNameRequired")}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={onClose}
            >
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? tCommon("loading") : tCommon("save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
