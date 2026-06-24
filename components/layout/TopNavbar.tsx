"use client";

import { useTranslations } from "next-intl";
import { Role } from "@prisma/client";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { SignOutButton } from "./SignOutButton";
import { GlobalSearch } from "./GlobalSearch";
import { QuickAddMenu } from "./QuickAddMenu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Building2 } from "lucide-react";
import type { LawyerOption } from "@/components/litigation/CreateLawsuitDialog";
import type { LawsuitOption } from "@/components/executions/CreateExecutionRequestDialog";

const roleLabels: Record<Role, { ar: string; en: string }> = {
  SUPER_ADMIN: { ar: "مدير النظام", en: "Super Admin" },
  LEGAL_MANAGER: { ar: "مدير الشؤون القانونية", en: "Legal Manager" },
  LAWYER: { ar: "محامٍ", en: "Lawyer" },
};

export function TopNavbar({
  userName,
  userRole,
  locale,
  lawyers,
  lawsuits,
}: {
  userName: string;
  userRole: Role;
  locale: string;
  lawyers: LawyerOption[];
  lawsuits: LawsuitOption[];
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
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-slate-200 bg-white px-4 shadow-sm md:px-6">
      <div className="flex shrink-0 items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white">
          <Building2 className="h-5 w-5" />
        </div>
        <div className="hidden text-start sm:block">
          <p className="text-sm font-bold text-slate-900">NJD</p>
          <p className="text-xs text-slate-500">{t("company")}</p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center">
        <GlobalSearch />
      </div>

      <div className="flex shrink-0 items-center gap-2 md:gap-3">
        <QuickAddMenu userRole={userRole} lawyers={lawyers} lawsuits={lawsuits} />
        <LanguageSwitcher />
        <Separator orientation="vertical" className="hidden h-8 sm:block" />
        <div className="hidden items-center gap-3 sm:flex">
          <Avatar className="h-9 w-9 border-2 border-slate-200">
            <AvatarFallback className="bg-slate-100 text-sm font-semibold text-slate-700">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="text-start">
            <p className="text-sm font-medium text-slate-900">{userName}</p>
            <p className="text-xs text-slate-500">{roleLabel}</p>
          </div>
        </div>
        <SignOutButton />
      </div>
    </header>
  );
}
