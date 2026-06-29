"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail } from "lucide-react";
import { toast } from "sonner";
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
import { updateSecondaryEmail } from "@/app/actions/auth/updateSecondaryEmail";

const schema = z.object({
  secondaryEmail: z
    .string()
    .min(1, "البريد الإلكتروني مطلوب")
    .email("صيغة البريد الإلكتروني غير صحيحة")
    .refine((value) => value.trim().toLowerCase().endsWith("@gmail.com"), {
      message: "يجب استخدام بريد Gmail (مثال: name@gmail.com)",
    }),
});

type FormValues = z.infer<typeof schema>;

export function SecondaryEmailDialog({
  open,
  primaryEmail,
  onComplete,
}: {
  open: boolean;
  primaryEmail: string;
  onComplete: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { secondaryEmail: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      const result = await updateSecondaryEmail(values.secondaryEmail);
      if (!result.success) {
        toast.error(result.error ?? "تعذر حفظ البريد الاحتياطي");
        return;
      }
      toast.success("تم حفظ البريد الاحتياطي لرمز التحقق الثنائي");
      onComplete();
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={() => undefined}>
      <DialogContent
        className="max-w-md border-border"
        onPointerDownOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Mail className="h-6 w-6" />
          </div>
          <DialogTitle>📧 البريد الاحتياطي للتحقق الثنائي</DialogTitle>
          <DialogDescription className="text-start leading-relaxed">
            أدخل بريد Gmail احتياطياً لاستلام رمز التحقق الثنائي (2FA) عند تسجيل
            الدخول. يجب أن يختلف عن بريد حسابك الرئيسي ({primaryEmail}).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4" dir="rtl">
          <div className="space-y-2">
            <Label htmlFor="secondaryEmail">بريد Gmail الاحتياطي</Label>
            <Input
              id="secondaryEmail"
              type="email"
              autoComplete="email"
              placeholder="example@gmail.com"
              className="h-10"
              {...register("secondaryEmail")}
            />
            {errors.secondaryEmail && (
              <p className="text-sm text-destructive">{errors.secondaryEmail.message}</p>
            )}
          </div>

          <Button type="submit" className="h-10 w-full" disabled={submitting}>
            {submitting ? "جاري الحفظ..." : "حفظ والدخول للنظام"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
