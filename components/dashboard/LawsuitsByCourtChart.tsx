"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type LawsuitCourtDatum = {
  courtName: string;
  count: number;
};

const chartColors = {
  grid: "hsl(var(--chart-grid))",
  axis: "hsl(var(--chart-axis))",
  label: "hsl(var(--chart-label))",
  bar: "hsl(var(--chart-bar))",
  cursor: "hsl(var(--chart-cursor))",
  border: "hsl(var(--border))",
};

export function LawsuitsByCourtChart({
  data,
  title,
  countLabel,
  emptyLabel,
  direction = "rtl",
}: {
  data: LawsuitCourtDatum[];
  title: string;
  countLabel: string;
  emptyLabel: string;
  direction?: "rtl" | "ltr";
}) {
  if (!data.length) {
    return (
      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base text-foreground">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-12 text-center text-sm text-muted-foreground">{emptyLabel}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border shadow-sm">
      <CardHeader>
        <CardTitle className="text-base text-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full" dir={direction}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 12, right: 8, left: 8, bottom: 72 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
              <XAxis
                dataKey="courtName"
                tick={{
                  fill: chartColors.axis,
                  fontSize: 11,
                  fontFamily: "var(--font-cairo), Cairo, sans-serif",
                }}
                interval={0}
                angle={-30}
                textAnchor="start"
                height={72}
                axisLine={{ stroke: chartColors.grid }}
                tickLine={{ stroke: chartColors.grid }}
              />
              <YAxis
                allowDecimals={false}
                tick={{
                  fill: chartColors.axis,
                  fontSize: 12,
                  fontFamily: "var(--font-cairo), Cairo, sans-serif",
                }}
                axisLine={{ stroke: chartColors.grid }}
                tickLine={{ stroke: chartColors.grid }}
                orientation={direction === "rtl" ? "right" : "left"}
              />
              <Tooltip
                cursor={{ fill: chartColors.cursor }}
                contentStyle={{
                  borderRadius: "8px",
                  border: `1px solid ${chartColors.border}`,
                  background: "hsl(var(--popover))",
                  color: "hsl(var(--popover-foreground))",
                  fontFamily: "var(--font-cairo), Cairo, sans-serif",
                  textAlign: direction === "rtl" ? "right" : "left",
                  direction,
                }}
                labelStyle={{ color: chartColors.label, fontWeight: 600 }}
                formatter={(value) => [value, countLabel]}
              />
              <Bar
                dataKey="count"
                fill={chartColors.bar}
                radius={[6, 6, 0, 0]}
                maxBarSize={72}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
