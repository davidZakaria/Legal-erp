"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileSignature,
  Building2,
  Scale,
  ShieldAlert,
  BellRing,
  Briefcase,
  ClipboardList,
  Wallet,
  BookOpen,
  BarChart3,
  ShieldCheck,
  Users,
  Settings,
  HardDrive,
} from "lucide-react";
import { Role } from "@prisma/client";
import type { Permission } from "@/lib/permissions/constants";
import { hasPermissionSync } from "@/lib/permissions";

const navItems: {
  href: string;
  labelKey: string;
  icon: typeof LayoutDashboard;
  roles: "all" | "admin" | "superAdmin";
  readPermission?: Permission;
}[] = [
  { href: "/", labelKey: "dashboard", icon: LayoutDashboard, roles: "all" },
  {
    href: "/contracts",
    labelKey: "contracts",
    icon: FileSignature,
    roles: "all",
    readPermission: "CONTRACTS_READ",
  },
  { href: "/gafi", labelKey: "gafi", icon: Building2, roles: "all", readPermission: "GAFI_READ" },
  {
    href: "/litigation",
    labelKey: "litigation",
    icon: Scale,
    roles: "all",
    readPermission: "LAWSUITS_READ",
  },
  {
    href: "/notices",
    labelKey: "notices",
    icon: BellRing,
    roles: "all",
    readPermission: "NOTICES_READ",
  },
  {
    href: "/experts",
    labelKey: "experts",
    icon: Briefcase,
    roles: "all",
    readPermission: "LAWSUITS_READ",
  },
  {
    href: "/prosecutions",
    labelKey: "prosecutions",
    icon: ShieldAlert,
    roles: "all",
    readPermission: "PROSECUTIONS_READ",
  },
  {
    href: "/expenses",
    labelKey: "expenses",
    icon: Wallet,
    roles: "all",
    readPermission: "FINANCIALS_READ",
  },
  { href: "/library", labelKey: "library", icon: BookOpen, roles: "all" },
  { href: "/performance", labelKey: "performance", icon: BarChart3, roles: "admin" },
  { href: "/audit-logs", labelKey: "auditLogs", icon: ClipboardList, roles: "admin" },
  { href: "/admin/users", labelKey: "adminUsers", icon: Users, roles: "admin" },
  { href: "/admin/settings", labelKey: "adminSettings", icon: Settings, roles: "admin" },
  { href: "/admin/security", labelKey: "adminSecurity", icon: ShieldCheck, roles: "superAdmin" },
  { href: "/admin/backups", labelKey: "adminBackups", icon: HardDrive, roles: "superAdmin" },
];

export function Sidebar({
  userRole,
  userPermissions,
}: {
  userRole: Role;
  userPermissions: string[];
}) {
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");
  const pathname = usePathname();

  const isAdmin =
    userRole === Role.SUPER_ADMIN || userRole === Role.LEGAL_MANAGER;
  const isSuperAdmin = userRole === Role.SUPER_ADMIN;

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-s border-slate-800 bg-slate-900 text-slate-100">
      <div className="border-b border-slate-800 p-5">
        <p className="text-start text-xs font-medium uppercase tracking-wider text-slate-400">
          {tCommon("company")}
        </p>
        <h2 className="mt-1 text-start text-sm font-bold leading-snug text-white">
          {tCommon("appName")}
        </h2>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems.map((item) => {
          if (item.roles === "admin" && !isAdmin) return null;
          if (item.roles === "superAdmin" && !isSuperAdmin) return null;
          if (
            item.readPermission &&
            !hasPermissionSync(userRole, userPermissions, item.readPermission)
          ) {
            return null;
          }
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
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all text-start",
                isActive
                  ? "bg-white/10 text-white shadow-sm ring-1 ring-white/10"
                  : "text-slate-400 hover:bg-card/5 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 p-4">
        <p className="text-start text-xs text-muted-foreground">
          New Jersey Developments © 2026
        </p>
      </div>
    </aside>
  );
}
