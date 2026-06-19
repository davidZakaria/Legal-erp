"use client";

import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  const t = useTranslations("common");

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => signOut({ callbackUrl: "/ar/login" })}
      className="gap-2 text-slate-600 hover:text-slate-900"
    >
      <LogOut className="h-4 w-4" />
      <span className="hidden sm:inline">{t("logout")}</span>
    </Button>
  );
}
