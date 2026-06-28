"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter, Link } from "@/i18n/navigation";
import { resolvePendingLoginCredentials, verifyOTP } from "@/app/actions/auth/login";
import { completeSignIn } from "@/lib/auth-client";

const PENDING_LOGIN_KEY = "njd-pending-login";

type PendingLogin = {
  email: string;
  pendingLoginToken: string;
  exp: number;
  devOtp?: string;
};

function maskEmail(value: string): string {
  const [local, domain] = value.split("@");
  if (!local || !domain) return value;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"•".repeat(Math.max(1, local.length - 2))}@${domain}`;
}

function TwoFactorForm() {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = (searchParams.get("email") ?? "").trim().toLowerCase();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [pendingLoginToken, setPendingLoginToken] = useState<string | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(PENDING_LOGIN_KEY);
    if (!raw) return;
    try {
      const pending = JSON.parse(raw) as PendingLogin;
      if (pending.devOtp) {
        setDevOtp(pending.devOtp);
      }
      if (pending.pendingLoginToken) {
        setPendingLoginToken(pending.pendingLoginToken);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const handleVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!email || code.trim().length !== 6) {
      setError(t("otpInvalid"));
      return;
    }

    const raw = sessionStorage.getItem(PENDING_LOGIN_KEY);
    if (!raw) {
      setError(t("otpSessionExpired"));
      return;
    }

    const pending = JSON.parse(raw) as PendingLogin;
    if (
      pending.exp < Date.now() ||
      pending.email.toLowerCase() !== email ||
      !pending.pendingLoginToken
    ) {
      sessionStorage.removeItem(PENDING_LOGIN_KEY);
      setError(t("otpSessionExpired"));
      return;
    }

    setLoading(true);
    try {
      const result = await verifyOTP(email, code.trim(), pending.pendingLoginToken);
      if (!result.success) {
        setError(result.error ?? t("otpInvalid"));
        return;
      }

      const credentials = await resolvePendingLoginCredentials(pending.pendingLoginToken);
      if (!credentials) {
        setError(t("otpSessionExpired"));
        return;
      }

      const signInResult = await completeSignIn({
        email: credentials.email,
        password: credentials.password,
        twoFactorPass: result.passToken,
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
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md border-border shadow-lg">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <div>
            <CardTitle className="text-xl text-foreground">{t("twoFactorTitle")}</CardTitle>
            <CardDescription className="mt-2 leading-relaxed">
              {t("twoFactorDescription")}
            </CardDescription>
            {email && (
              <p className="mt-3 text-sm text-muted-foreground">
                {t("twoFactorEmailSentTo")}{" "}
                <span dir="ltr" className="font-medium text-foreground">
                  {maskEmail(email)}
                </span>
              </p>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="space-y-5">
            {devOtp && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-center">
                <p className="text-xs font-medium uppercase tracking-wide text-amber-800">
                  {t("devOtpLabel")}
                </p>
                <p className="mt-1 font-mono text-2xl font-semibold tracking-[0.35em] text-amber-950">
                  {devOtp}
                </p>
                <p className="mt-1 text-xs text-amber-700">{t("devOtpHint")}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="otp">{t("otpLabel")}</Label>
              <Input
                id="otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder={t("otpPlaceholder")}
                className="h-12 text-center text-xl tracking-[0.4em] tabular-nums"
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
              className="h-10 w-full"
              disabled={loading || code.length !== 6 || !pendingLoginToken}
            >
              {loading ? tCommon("loading") : t("verifyOtpButton")}
            </Button>
            <Button type="button" variant="link" className="w-full text-muted-foreground" asChild>
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
