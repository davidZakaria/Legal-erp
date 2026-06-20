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
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base text-slate-800">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-12 text-center text-sm text-slate-500">{emptyLabel}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base text-slate-800">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full" dir={direction}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 12, right: 8, left: 8, bottom: 72 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="courtName"
                tick={{
                  fill: "#334155",
                  fontSize: 11,
                  fontFamily: "var(--font-cairo), Cairo, sans-serif",
                }}
                interval={0}
                angle={-30}
                textAnchor="start"
                height={72}
                axisLine={{ stroke: "#cbd5e1" }}
                tickLine={{ stroke: "#cbd5e1" }}
              />
              <YAxis
                allowDecimals={false}
                tick={{
                  fill: "#64748b",
                  fontSize: 12,
                  fontFamily: "var(--font-cairo), Cairo, sans-serif",
                }}
                axisLine={{ stroke: "#cbd5e1" }}
                tickLine={{ stroke: "#cbd5e1" }}
                orientation={direction === "rtl" ? "right" : "left"}
              />
              <Tooltip
                cursor={{ fill: "#f8fafc" }}
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  fontFamily: "var(--font-cairo), Cairo, sans-serif",
                  textAlign: direction === "rtl" ? "right" : "left",
                  direction,
                }}
                labelStyle={{ color: "#0f172a", fontWeight: 600 }}
                formatter={(value) => [value, countLabel]}
              />
              <Bar
                dataKey="count"
                fill="#0f172a"
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
