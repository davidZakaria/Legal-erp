"use client";

import { useTranslations } from "next-intl";
import { Role } from "@prisma/client";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { SignOutButton } from "./SignOutButton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Building2 } from "lucide-react";

const roleLabels: Record<Role, { ar: string; en: string }> = {
  SUPER_ADMIN: { ar: "مدير النظام", en: "Super Admin" },
  LEGAL_MANAGER: { ar: "مدير الشؤون القانونية", en: "Legal Manager" },
  LAWYER: { ar: "محامٍ", en: "Lawyer" },
};

export function TopNavbar({
  userName,
  userRole,
  locale,
}: {
  userName: string;
  userRole: Role;
  locale: string;
}) {
  const t = useTranslations("common");
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  const roleLabel =
    locale === "ar" ? roleLabels[userRole].ar : roleLabels[userRole].en;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white">
          <Building2 className="h-5 w-5" />
        </div>
        <div className="text-start">
          <p className="text-sm font-bold text-slate-900">NJD</p>
          <p className="text-xs text-slate-500">{t("company")}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <LanguageSwitcher />
        <Separator orientation="vertical" className="h-8" />
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 border-2 border-slate-200">
            <AvatarFallback className="bg-slate-100 text-sm font-semibold text-slate-700">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden text-start sm:block">
            <p className="text-sm font-medium text-slate-900">{userName}</p>
            <p className="text-xs text-slate-500">{roleLabel}</p>
          </div>
        </div>
        <SignOutButton />
      </div>
    </header>
  );
}
