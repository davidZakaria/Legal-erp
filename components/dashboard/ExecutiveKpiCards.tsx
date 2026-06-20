import {
  AlertTriangle,
  Building2,
  FileSignature,
  Scale,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type ExecutiveKpi = {
  key: string;
  title: string;
  value: string;
  icon: LucideIcon;
  radar?: boolean;
};

const iconStyles: Record<string, { accent: string; bg: string }> = {
  lawsuits: { accent: "text-slate-900", bg: "bg-slate-100" },
  gafi: { accent: "text-blue-600", bg: "bg-blue-50" },
  contracts: { accent: "text-emerald-700", bg: "bg-emerald-50" },
  guarantees: { accent: "text-red-700", bg: "bg-red-50" },
};

export function ExecutiveKpiCards({ kpis }: { kpis: ExecutiveKpi[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        const style = iconStyles[kpi.key] ?? iconStyles.lawsuits;

        return (
          <Card
            key={kpi.key}
            className={cn(
              "border-slate-200 shadow-sm transition-colors",
              kpi.radar &&
                "animate-pulse border-red-500 bg-red-50 text-red-700"
            )}
          >
            <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
              <CardTitle
                className={cn(
                  "text-sm font-medium leading-snug",
                  kpi.radar ? "text-red-700" : "text-slate-600"
                )}
              >
                {kpi.title}
              </CardTitle>
              <div
                className={cn(
                  "shrink-0 rounded-lg p-2",
                  kpi.radar ? "bg-red-100" : style.bg
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4",
                    kpi.radar ? "text-red-700" : style.accent
                  )}
                />
              </div>
            </CardHeader>
            <CardContent>
              <p
                className={cn(
                  "text-3xl font-bold tracking-tight",
                  kpi.radar ? "text-red-700" : style.accent
                )}
              >
                {kpi.value}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
