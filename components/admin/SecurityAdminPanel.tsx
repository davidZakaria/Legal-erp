"use client";

import { useTranslations } from "next-intl";
import { Shield, ShieldCheck, ShieldOff } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type TurnstileStatus = {
  isConfigured: boolean;
  hasProductionKeys: boolean;
  keysMismatch: boolean;
  isUsingDevKeys: boolean;
  siteKeyPreview: string | null;
};

export function SecurityAdminPanel({ turnstile }: { turnstile: TurnstileStatus }) {
  const t = useTranslations("admin");

  const statusBadge = turnstile.hasProductionKeys ? (
    <Badge className="bg-green-600 hover:bg-green-600">{t("turnstileStatusProduction")}</Badge>
  ) : turnstile.isUsingDevKeys ? (
    <Badge variant="secondary">{t("turnstileStatusDev")}</Badge>
  ) : (
    <Badge variant="destructive">{t("turnstileStatusDisabled")}</Badge>
  );

  const StatusIcon = turnstile.isConfigured ? ShieldCheck : ShieldOff;

  return (
    <div className="space-y-6">
      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t("turnstileTitle")}
          </CardTitle>
          <CardDescription>{t("turnstileDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <StatusIcon
                className={`h-8 w-8 shrink-0 ${
                  turnstile.isConfigured ? "text-green-600" : "text-muted-foreground"
                }`}
              />
              <div>
                <p className="font-medium">{t("turnstileStatusLabel")}</p>
                <p className="text-sm text-muted-foreground">
                  {turnstile.isConfigured
                    ? t("turnstileStatusActiveHint")
                    : t("turnstileStatusInactiveHint")}
                </p>
              </div>
            </div>
            {statusBadge}
          </div>

          {turnstile.keysMismatch && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              {t("turnstileKeysMismatch")}
            </div>
          )}

          {turnstile.siteKeyPreview && (
            <div className="rounded-lg border bg-muted/80 p-4">
              <p className="text-sm font-medium text-muted-foreground">
                {t("turnstileSiteKeyLabel")}
              </p>
              <p className="mt-1 font-mono text-sm">{turnstile.siteKeyPreview}</p>
            </div>
          )}

          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">{t("turnstileEnvTitle")}</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>
                <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
                  NEXT_PUBLIC_TURNSTILE_SITE_KEY
                </code>
              </li>
              <li>
                <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
                  TURNSTILE_SECRET_KEY
                </code>
              </li>
            </ul>
            <p className="mt-3">{t("turnstileEnvHint")}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
