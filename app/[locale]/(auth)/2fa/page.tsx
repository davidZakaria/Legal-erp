"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter, Link } from "@/i18n/navigation";
import { verifyOTP } from "@/app/actions/auth/login";
import { completeSignIn } from "@/lib/auth-client";

const PENDING_LOGIN_KEY = "njd-pending-login";

function TwoFactorForm() {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!email || code.trim().length !== 6) {
      setError(t("otpInvalid"));
      return;
    }

    setLoading(true);
    try {
      const result = await verifyOTP(email, code.trim());
      if (!result.success) {
        setError(result.error ?? t("otpInvalid"));
        return;
      }

      const raw = sessionStorage.getItem(PENDING_LOGIN_KEY);
      if (!raw) {
        setError(t("otpSessionExpired"));
        return;
      }

      const pending = JSON.parse(raw) as { email: string; password: string; exp: number };
      if (pending.exp < Date.now() || pending.email !== email) {
        sessionStorage.removeItem(PENDING_LOGIN_KEY);
        setError(t("otpSessionExpired"));
        return;
      }

      const signInResult = await completeSignIn({
        email: pending.email,
        password: pending.password,
        skipTurnstile: true,
        router,
      });

      sessionStorage.removeItem(PENDING_LOGIN_KEY);

      if (!signInResult.success) {
        setError(t("loginError"));
      }
    } catch {
      setError(t("otpInvalid"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md border-slate-200 shadow-lg">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-red-700 text-white">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <div>
            <CardTitle className="text-xl text-slate-900">{t("twoFactorTitle")}</CardTitle>
            <CardDescription className="mt-2">{t("twoFactorDescription")}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp">{t("otpLabel")}</Label>
              <Input
                id="otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                className="h-10 text-center text-lg tracking-widest"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
                required
              />
            </div>
            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">
                {error}
              </p>
            )}
            <Button
              type="submit"
              className="h-10 w-full bg-slate-900 hover:bg-slate-800"
              disabled={loading || code.length !== 6}
            >
              {loading ? tCommon("loading") : t("verifyOtpButton")}
            </Button>
            <Button type="button" variant="link" className="w-full" asChild>
              <Link href="/login">{t("backToLogin")}</Link>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function TwoFactorPage() {
  return (
    <Suspense fallback={null}>
      <TwoFactorForm />
    </Suspense>
  );
}
