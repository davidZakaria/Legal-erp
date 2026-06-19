"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  Building2,
  Scale,
  Shield,
  ClipboardList,
} from "lucide-react";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { SignOutButton } from "./SignOutButton";
import { Role } from "@prisma/client";

// Use logical properties only (ms-, me-, ps-, pe-, text-start, border-e) for RTL/LTR flip.

const navItems = [
  { href: "/", labelKey: "dashboard", icon: LayoutDashboard, roles: "all" },
  { href: "/contracts", labelKey: "contracts", icon: FileText, roles: "all" },
  { href: "/gafi", labelKey: "gafi", icon: Building2, roles: "all" },
  { href: "/litigation", labelKey: "litigation", icon: Scale, roles: "all" },
  { href: "/prosecutions", labelKey: "prosecutions", icon: Shield, roles: "all" },
  { href: "/audit-logs", labelKey: "auditLogs", icon: ClipboardList, roles: "admin" },
] as const;

export function Sidebar({
  userName,
  userRole,
}: {
  userName: string;
  userRole: Role;
}) {
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");
  const pathname = usePathname();

  const isAdmin =
    userRole === Role.SUPER_ADMIN || userRole === Role.LEGAL_MANAGER;

  return (
    <aside className="flex h-screen w-64 flex-col border-e bg-card">
      <div className="flex flex-col gap-1 border-b p-4">
        <h1 className="text-start text-sm font-bold leading-tight text-primary">
          {tCommon("appName")}
        </h1>
        <p className="text-start text-xs text-muted-foreground">
          {tCommon("company")}
        </p>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          if (item.roles === "admin" && !isAdmin) return null;
          const Icon = item.icon;
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors text-start",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-accent"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </nav>

      <div className="space-y-3 border-t p-4">
        <p className="text-start text-sm font-medium">{userName}</p>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <SignOutButton />
        </div>
      </div>
    </aside>
  );
}
