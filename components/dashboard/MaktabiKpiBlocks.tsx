import { Scale, ScrollText, Shield, CheckCircle, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatItem = {
  label: string;
  value: number | string;
  icon: typeof Scale;
  variant?: "default" | "success" | "danger";
};

function StatBlock({
  title,
  items,
}: {
  title: string;
  items: StatItem[];
}) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="border-b border-slate-100 pb-3">
        <CardTitle className="text-base font-semibold text-slate-800">{title}</CardTitle>
      </CardHeader>
      <CardContent className={cn("grid gap-3 pt-4", items.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3")}>
        {items.map((item) => {
          const Icon = item.icon;
          const isDanger = item.variant === "danger";
          const isSuccess = item.variant === "success";

          return (
            <div
              key={item.label}
              className={cn(
                "rounded-lg border p-4",
                isDanger && "border-red-200 bg-red-50",
                isSuccess && "border-emerald-200 bg-emerald-50",
                !isDanger && !isSuccess && "border-slate-100 bg-slate-50/50"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <p
                  className={cn(
                    "text-xs font-medium leading-snug",
                    isDanger && "text-red-700",
                    isSuccess && "text-emerald-800",
                    !isDanger && !isSuccess && "text-slate-600"
                  )}
                >
                  {item.label}
                </p>
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    isDanger && "text-red-600",
                    isSuccess && "text-emerald-700",
                    !isDanger && !isSuccess && "text-slate-500"
                  )}
                />
              </div>
              <p
                className={cn(
                  "mt-2 text-2xl font-bold tracking-tight",
                  isDanger && "text-red-700",
                  isSuccess && "text-emerald-800",
                  !isDanger && !isSuccess && "text-slate-900"
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
  completedTasks: number;
  overdueItems: number;
  assetsLabels: { lawsuits: string; poas: string; executions: string };
  tasksLabels: { completed: string; overdue: string };
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <StatBlock
        title={assetsTitle}
        items={[
          { label: assetsLabels.lawsuits, value: activeLawsuits, icon: Scale },
          { label: assetsLabels.poas, value: activePoas, icon: ScrollText },
          { label: assetsLabels.executions, value: pendingExecutions, icon: Shield },
        ]}
      />
      <StatBlock
        title={tasksTitle}
        items={[
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
