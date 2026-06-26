"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { signOutUser } from "@/app/actions/auth/signOutUser";

export function SignOutButton() {
  const t = useTranslations("common");
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  const handleSignOut = () => {
    startTransition(async () => {
      try {
        const redirectUrl = await signOutUser(locale);
        window.location.assign(redirectUrl);
      } catch {
        window.location.assign(`/${locale}/login`);
      }
    });
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={handleSignOut}
      className="gap-2 text-slate-600 hover:text-slate-900"
    >
      <LogOut className="h-4 w-4" />
      <span className="hidden sm:inline">{t("logout")}</span>
    </Button>
  );
}
