"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "@/i18n/navigation";
import { updateInitialPassword } from "@/app/actions/auth/updateInitialPassword";

const schema = z
  .object({
    newPassword: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل"),
    confirmPassword: z.string().min(8),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "كلمتا المرور غير متطابقتين",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export function SetupPasswordForm() {
  const router = useRouter();
  const { update } = useSession();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      const result = await updateInitialPassword(values.newPassword);
      if (!result.success) {
        toast.error(result.error ?? "تعذر تحديث كلمة المرور");
        return;
      }

      try {
        await update({ requiresPasswordChange: false });
      } catch {
        /* session refresh best-effort */
      }

      toast.success("تم تأمين حسابك بنجاح. مرحباً بك في النظام.");
      window.location.assign("/");
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4" dir="rtl">
      <Card className="w-full max-w-md border-slate-200 shadow-lg">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-slate-900 text-white">
            <LockKeyhole className="h-7 w-7" />
          </div>
          <div>
            <CardTitle className="text-xl text-slate-900">
              🔒 تأمين الحساب (إعداد كلمة المرور الخاصة)
            </CardTitle>
            <CardDescription className="mt-3 text-start leading-relaxed text-slate-600">
              مرحباً بك في النظام. لأسباب أمنية وبناءً على سياسة أمن المعلومات، يجب عليك تغيير
              كلمة المرور المؤقتة قبل الدخول للنظام.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                className="h-10"
                {...register("newPassword")}
              />
              {errors.newPassword && (
                <p className="text-sm text-destructive">{errors.newPassword.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                className="h-10"
                {...register("confirmPassword")}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>
            <Button
              type="submit"
              className="h-10 w-full bg-slate-900 hover:bg-slate-800"
              disabled={submitting}
            >
              {submitting ? "جاري الحفظ..." : "حفظ كلمة المرور والدخول"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
