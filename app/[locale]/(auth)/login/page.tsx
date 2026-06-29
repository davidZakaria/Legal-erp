"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "@/i18n/navigation";
import { initiateLogin } from "@/app/actions/auth/login";
import { completeSignIn } from "@/lib/auth-client";
import { getTurnstileSiteKey } from "@/lib/turnstile-config";

const PENDING_LOGIN_KEY = "njd-pending-login";
const turnstileSiteKey = getTurnstileSiteKey();

export default function LoginPage() {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dbDown, setDbDown] = useState(false);
  const [loading, setLoading] = useState(false);

  const resetTurnstileWidget = useCallback(() => {
    setTurnstileToken(null);
    turnstileRef.current?.reset();
  }, []);

  useEffect(() => {
    fetch("/api/health/db")
      .then((res) => setDbDown(!res.ok))
      .catch(() => setDbDown(true));
  }, []);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      setError(t("loginError"));
      return;
    }

    if (turnstileSiteKey && !turnstileToken) {
      setError(t("turnstileRequired"));
      return;
    }

    setLoading(true);

    try {
      const initResult = await initiateLogin(trimmedEmail, password, turnstileToken);

      if (!initResult.success) {
        if (initResult.resetTurnstile) {
          resetTurnstileWidget();
        }
        setError(
          initResult.error === "Invalid credentials"
            ? t("loginError")
            : initResult.error === "Turnstile verification failed"
              ? t("turnstileFailed")
              : initResult.error
        );
        return;
      }

      if (initResult.requires2FA) {
        sessionStorage.setItem(
          PENDING_LOGIN_KEY,
          JSON.stringify({
            email: initResult.email,
            pendingLoginToken: initResult.pendingLoginToken,
            exp: Date.now() + 10 * 60 * 1000,
            devOtp: initResult.devOtp,
          })
        );
        router.push(`/2fa?email=${encodeURIComponent(initResult.email)}`);
        return;
      }

      const signInResult = await completeSignIn({
        email: trimmedEmail,
        password,
        router,
      });

      if (!signInResult.success) {
        resetTurnstileWidget();
        setError(t("loginError"));
      }
    } catch (error) {
      console.error("[login] Unexpected error:", error);
      resetTurnstileWidget();
      setError(t("loginError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md border-border shadow-lg">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Building2 className="h-7 w-7" />
          </div>
          <div>
            <CardTitle className="text-xl text-foreground">{tCommon("appName")}</CardTitle>
            <CardDescription className="mt-2">{t("welcome")}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                className="h-10"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("password")}</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                className="h-10"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
              />
            </div>

            {turnstileSiteKey && (
              <div className="flex justify-center">
                <Turnstile
                  ref={turnstileRef}
                  siteKey={turnstileSiteKey}
                  options={{ refreshExpired: "auto" }}
                  onSuccess={(token) => setTurnstileToken(token)}
                  onExpire={() => setTurnstileToken(null)}
                  onError={() => {
                    setTurnstileToken(null);
                    setError(t("turnstileRequired"));
                  }}
                />
              </div>
            )}

            {dbDown && (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-center text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                {t("dbUnavailable")}
              </p>
            )}
            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">
                {error}
              </p>
            )}
            <Button
              type="submit"
              className="h-10 w-full"
              disabled={loading || dbDown || (Boolean(turnstileSiteKey) && !turnstileToken)}
            >
              {loading ? tCommon("loading") : t("loginButton")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
