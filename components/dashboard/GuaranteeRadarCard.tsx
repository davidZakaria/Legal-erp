import { format, addDays, isBefore } from "date-fns";
import { Radar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { LawsuitsByCourtChart } from "./LawsuitsByCourtChart";

export type GuaranteeRadarItem = {
  id: string;
  contractorName: string;
  projectName: string;
  guaranteeExpiryDate: string;
};

export function GuaranteeRadarCard({
  title,
  emptyLabel,
  items,
  chartTitle,
  chartData,
  chartCountLabel,
  chartEmptyLabel,
  direction,
}: {
  title: string;
  emptyLabel: string;
  items: GuaranteeRadarItem[];
  chartTitle: string;
  chartData: Array<{ courtName: string; count: number }>;
  chartCountLabel: string;
  chartEmptyLabel: string;
  direction: "rtl" | "ltr";
}) {
  const threshold = addDays(new Date(), 30);

  return (
    <div className="space-y-4">
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="flex flex-row items-center gap-2 border-b border-slate-100 pb-3">
          <Radar className="h-5 w-5 text-red-600" />
          <CardTitle className="text-base font-semibold text-slate-900">{title}</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {items.length === 0 ? (
            <p className="text-sm text-slate-500">{emptyLabel}</p>
          ) : (
            <ul className="space-y-2">
              {items.map((item) => {
                const expiry = new Date(item.guaranteeExpiryDate);
                const urgent = isBefore(expiry, threshold);
                return (
                  <li
                    key={item.id}
                    className={cn(
                      "rounded-md border px-3 py-2 text-sm",
                      urgent ? "border-red-200 bg-red-50" : "border-slate-100 bg-slate-50"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 text-start">
                        <p className={cn("font-medium", urgent && "text-red-700")}>
                          {item.contractorName}
                        </p>
                        <p className="text-xs text-slate-500">{item.projectName}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "shrink-0 text-xs",
                          urgent && "border-red-300 text-red-700"
                        )}
                      >
                        {format(expiry, "yyyy-MM-dd")}
                      </Badge>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <LawsuitsByCourtChart
        data={chartData}
        title={chartTitle}
        countLabel={chartCountLabel}
        emptyLabel={chartEmptyLabel}
        direction={direction}
      />
    </div>
  );
}
