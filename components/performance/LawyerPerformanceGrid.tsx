"use client";

import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { LawyerKpi } from "@/lib/performance/calculateLawyerKpis";

export function LawyerPerformanceGrid({ kpis }: { kpis: LawyerKpi[] }) {
  const t = useTranslations("performance");

  if (!kpis.length) {
    return (
      <p className="rounded-lg border border-dashed border-border bg-muted/50 px-4 py-12 text-center text-sm text-muted-foreground">
        {t("noLawyers")}
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {kpis.map((lawyer) => (
        <Card
          key={lawyer.lawyerId}
          className={cn(
            "border-border shadow-sm",
            lawyer.lowPerformance && "border-red-200 bg-red-50/30"
          )}
        >
          <CardHeader className="flex flex-row items-center gap-3 border-b border-border pb-4">
            <Avatar className="h-11 w-11 border-2 border-border">
              <AvatarFallback className="bg-primary text-sm font-bold text-primary-foreground">
                {lawyer.initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 text-start">
              <CardTitle className="truncate text-base text-foreground">{lawyer.lawyerName}</CardTitle>
              {lawyer.lowPerformance && (
                <Badge variant="destructive" className="mt-1 text-xs">
                  {t("lowPerformanceBadge")}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-md bg-muted/50 p-2">
                <p className="text-muted-foreground">{t("activeLawsuits")}</p>
                <p className="mt-1 text-lg font-bold text-foreground">{lawyer.activeLawsuits}</p>
              </div>
              <div className="rounded-md bg-red-50 p-2">
                <p className="text-red-600">{t("overdueItems")}</p>
                <p className="mt-1 text-lg font-bold text-red-600">{lawyer.overdueItems}</p>
              </div>
              <div className="rounded-md bg-emerald-50 p-2">
                <p className="text-emerald-700">{t("completedItems")}</p>
                <p className="mt-1 text-lg font-bold text-green-600">{lawyer.completedItems}</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{t("completionRate")}</span>
                <span
                  className={cn(
                    "font-bold",
                    lawyer.lowPerformance ? "text-red-600" : "text-foreground"
                  )}
                >
                  {lawyer.completionRate}%
                </span>
              </div>
              <Progress
                value={lawyer.completionRate}
                className={cn(lawyer.lowPerformance && "[&>div]:bg-red-600")}
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
