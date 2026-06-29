"use client";

import { useTranslations } from "next-intl";
import { format } from "date-fns";
import {
  Bell,
  Building2,
  Calendar,
  CheckCircle,
  Scale,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type {
  InAppNotification,
  InAppNotificationType,
} from "@/lib/notifications/in-app-notifications";

const TYPE_ICONS: Record<InAppNotificationType, typeof Bell> = {
  session: Scale,
  legalTask: CheckCircle,
  gafiTask: Building2,
  notice: Bell,
  expense: Wallet,
};

export function NotificationBell({
  notifications,
}: {
  notifications: InAppNotification[];
}) {
  const t = useTranslations("notifications");
  const urgentCount = notifications.filter((n) => n.urgent).length;
  const badgeCount = urgentCount > 0 ? urgentCount : notifications.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 text-muted-foreground"
          aria-label={t("title")}
        >
          <Bell className="h-5 w-5" />
          {badgeCount > 0 && (
            <span className="absolute end-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {badgeCount > 9 ? "9+" : badgeCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-w-[calc(100vw-2rem)]">
        <DropdownMenuLabel className="flex items-center justify-between gap-2">
          <span>{t("title")}</span>
          {notifications.length > 0 && (
            <span className="text-xs font-normal text-muted-foreground">
              {t("count", { count: notifications.length })}
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            {t("empty")}
          </div>
        ) : (
          notifications.map((item) => {
            const Icon = TYPE_ICONS[item.type];
            return (
              <DropdownMenuItem key={item.id} asChild className="cursor-pointer p-0">
                <Link
                  href={item.href}
                  className={cn(
                    "flex w-full items-start gap-3 px-3 py-2.5",
                    item.urgent && "bg-red-50/80 dark:bg-red-950/30"
                  )}
                >
                  <Icon
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0",
                      item.urgent ? "text-red-600" : "text-muted-foreground"
                    )}
                  />
                  <div className="min-w-0 flex-1 text-start">
                    <p
                      className={cn(
                        "truncate text-sm",
                        item.urgent ? "font-semibold text-red-700 dark:text-red-400" : "font-medium"
                      )}
                    >
                      {item.title}
                    </p>
                    {item.subtitle && (
                      <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
                    )}
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(item.at), "yyyy-MM-dd")}
                      <span className="mx-1">·</span>
                      {t(`type_${item.type}`)}
                    </p>
                  </div>
                </Link>
              </DropdownMenuItem>
            );
          })
        )}
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="cursor-pointer justify-center text-center text-sm font-medium text-primary">
              <Link href="/">{t("viewDashboard")}</Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
