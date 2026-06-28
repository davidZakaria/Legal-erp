import {
  Scale,
  ScrollText,
  Shield,
  CheckCircle,
  AlertTriangle,
  BellRing,
  Radar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatItem = {
  label: string;
  value: number | string;
  icon: typeof Scale;
  variant?: "default" | "success" | "danger" | "warning";
  pulse?: boolean;
};

function StatBlock({
  title,
  items,
}: {
  title: string;
  items: StatItem[];
}) {
  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="border-b border-border pb-3">
        <CardTitle className="text-base font-semibold text-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent
        className={cn(
          "grid gap-3 pt-4",
          items.length <= 2
            ? "sm:grid-cols-2"
            : items.length === 3
              ? "sm:grid-cols-3"
              : "sm:grid-cols-2 lg:grid-cols-4"
        )}
      >
        {items.map((item) => {
          const Icon = item.icon;
          const isDanger = item.variant === "danger";
          const isSuccess = item.variant === "success";
          const isWarning = item.variant === "warning";

          return (
            <div
              key={item.label}
              className={cn(
                "rounded-lg border p-4",
                isDanger && "border-red-500 bg-red-50 dark:border-red-500/60 dark:bg-red-950/40",
                isSuccess &&
                  "border-emerald-200 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-950/30",
                isWarning &&
                  "border-orange-500 bg-orange-50 dark:border-orange-500/60 dark:bg-orange-950/35",
                !isDanger &&
                  !isSuccess &&
                  !isWarning &&
                  "border-border bg-muted/50",
                item.pulse && isDanger && "kpi-risk-pulse-danger",
                item.pulse && isWarning && "kpi-risk-pulse-warning"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <p
                  className={cn(
                    "text-xs font-medium leading-snug",
                    isDanger && "text-red-700 dark:text-red-400",
                    isSuccess && "text-emerald-800 dark:text-emerald-400",
                    isWarning && "text-orange-800 dark:text-orange-400",
                    !isDanger && !isSuccess && !isWarning && "text-muted-foreground"
                  )}
                >
                  {item.label}
                </p>
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    isDanger && "text-red-600 dark:text-red-400",
                    isSuccess && "text-emerald-700 dark:text-emerald-400",
                    isWarning && "text-orange-600 dark:text-orange-400",
                    !isDanger && !isSuccess && !isWarning && "text-muted-foreground"
                  )}
                />
              </div>
              <p
                className={cn(
                  "mt-2 text-2xl font-bold tracking-tight",
                  isDanger && "text-red-700 dark:text-red-400",
                  isSuccess && "text-emerald-800 dark:text-emerald-400",
                  isWarning && "text-orange-800 dark:text-orange-400",
                  !isDanger && !isSuccess && !isWarning && "text-foreground"
                )}
              >
                {item.value}
              </p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export function MaktabiKpiBlocks({
  assetsTitle,
  tasksTitle,
  activeLawsuits,
  activePoas,
  pendingExecutions,
  pendingNotices,
  expiringGuarantees,
  urgentExpiringGuarantees,
  completedTasks,
  overdueItems,
  assetsLabels,
  tasksLabels,
}: {
  assetsTitle: string;
  tasksTitle: string;
  activeLawsuits: number;
  activePoas: number;
  pendingExecutions: number;
  pendingNotices: number;
  expiringGuarantees: number;
  urgentExpiringGuarantees: number;
  completedTasks: number;
  overdueItems: number;
  assetsLabels: { lawsuits: string; poas: string; executions: string; pendingNotices: string };
  tasksLabels: { completed: string; overdue: string; expiringGuarantees: string };
}) {
  const guaranteeVariant =
    urgentExpiringGuarantees > 0
      ? ("danger" as const)
      : expiringGuarantees > 0
        ? ("warning" as const)
        : ("default" as const);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <StatBlock
        title={assetsTitle}
        items={[
          { label: assetsLabels.lawsuits, value: activeLawsuits, icon: Scale },
          { label: assetsLabels.poas, value: activePoas, icon: ScrollText },
          { label: assetsLabels.executions, value: pendingExecutions, icon: Shield },
          {
            label: assetsLabels.pendingNotices,
            value: pendingNotices,
            icon: BellRing,
            variant: pendingNotices > 0 ? "warning" : "default",
          },
        ]}
      />
      <StatBlock
        title={tasksTitle}
        items={[
          {
            label: tasksLabels.expiringGuarantees,
            value: expiringGuarantees,
            icon: Radar,
            variant: guaranteeVariant,
            pulse: expiringGuarantees > 0,
          },
          {
            label: tasksLabels.completed,
            value: completedTasks,
            icon: CheckCircle,
            variant: "success",
          },
          {
            label: tasksLabels.overdue,
            value: overdueItems,
            icon: AlertTriangle,
            variant: "danger",
          },
        ]}
      />
    </div>
  );
}
