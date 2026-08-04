"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface WeeklyTrendChartProps {
  data: { date: string; articles: number; views: number }[];
}

export function WeeklyTrendChart({ data }: WeeklyTrendChartProps) {
  const formatted = data.map((d) => ({ ...d, label: d.date.slice(5).replace("-", "/") }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">주간 등록 추이</CardTitle>
      </CardHeader>
      <CardContent className="h-64 pt-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formatted} margin={{ left: -20, right: 8, top: 8 }}>
            <defs>
              <linearGradient id="articlesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={28} />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
                color: "hsl(var(--popover-foreground))",
              }}
              labelFormatter={(label) => `${label}`}
              formatter={(value) => [`${value}건`, "등록 기사"]}
            />
            <Area type="monotone" dataKey="articles" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#articlesGradient)" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
