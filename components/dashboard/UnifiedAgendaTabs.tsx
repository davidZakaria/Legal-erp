"use client";

import { format } from "date-fns";
import { useTranslations } from "next-intl";
import { Building2, CheckCircle, Gavel } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { AgendaItem } from "@/lib/dashboard/agenda";

const typeIcons = {
  session: Gavel,
  gafi: Building2,
  legalTask: CheckCircle,
} as const;

function AgendaTimeline({ items, emptyLabel }: { items: AgendaItem[]; emptyLabel: string }) {
  if (!items.length) {
    return (
      <p className="rounded-lg border border-dashed border-border bg-muted/50 px-4 py-10 text-center text-sm text-muted-foreground">
        {emptyLabel}
      </p>
    );
  }

  return (
    <ol className="relative space-y-0 border-s border-border ps-6">
      {items.map((item, index) => {
        const Icon = typeIcons[item.type];
        return (
          <li key={`${item.type}-${item.id}`} className="relative pb-6 last:pb-0">
            {index < items.length - 1 && (
              <span className="absolute -start-px top-8 h-[calc(100%-1rem)] w-px bg-slate-200" />
            )}
            <span
              className={cn(
                "absolute -start-[1.65rem] flex h-8 w-8 items-center justify-center rounded-full border-2 bg-card",
                item.overdue ? "border-red-500 text-red-600" : "border-border text-muted-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
            </span>

            <div className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card p-3 shadow-sm">
              <div className="min-w-0 flex-1 text-start">
                <p
                  className={cn(
                    "text-sm",
                    item.overdue ? "font-bold text-red-600 dark:text-red-400" : "font-semibold text-foreground"
                  )}
                >
                  {format(item.date, "yyyy-MM-dd HH:mm")} — {item.title}
                </p>
                {item.subtitle && (
                  <p
                    className={cn(
                      "mt-1 text-xs",
                      item.overdue ? "font-medium text-red-500" : "text-muted-foreground"
                    )}
                  >
                    {item.subtitle}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-center gap-1">
                <Avatar className="h-8 w-8 border border-border">
                  <AvatarFallback
                    className={cn(
                      "text-[10px] font-bold",
                      item.overdue ? "bg-red-50 text-red-700" : "bg-slate-100 text-foreground"
                    )}
                  >
                    {item.lawyerInitials}
                  </AvatarFallback>
                </Avatar>
                <span className="max-w-[4.5rem] truncate text-[10px] text-slate-400">
                  {item.lawyerName}
                </span>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function UnifiedAgendaTabs({
  todayItems,
  weekItems,
}: {
  todayItems: AgendaItem[];
  weekItems: AgendaItem[];
}) {
  const t = useTranslations("dashboard");

  return (
    <Tabs defaultValue="today">
      <TabsList>
        <TabsTrigger value="today">{t("agendaToday")}</TabsTrigger>
        <TabsTrigger value="week">{t("agendaWeek")}</TabsTrigger>
      </TabsList>
      <TabsContent value="today">
        <AgendaTimeline items={todayItems} emptyLabel={t("agendaEmptyToday")} />
      </TabsContent>
      <TabsContent value="week">
        <AgendaTimeline items={weekItems} emptyLabel={t("agendaEmptyWeek")} />
      </TabsContent>
    </Tabs>
  );
}
