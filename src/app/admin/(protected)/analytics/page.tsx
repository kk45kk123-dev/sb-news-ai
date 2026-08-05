"use client";

import * as React from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend, Bar, BarChart, XAxis, YAxis, CartesianGrid } from "recharts";
import { useAdminNewsListQuery } from "@/lib/query/use-admin";
import { useCssVarColors } from "@/hooks/use-css-var-colors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const SENTIMENT_VAR: Record<string, string> = {
  positive: "--success",
  neutral: "--muted-foreground",
  negative: "--destructive",
};
const SENTIMENT_LABEL: Record<string, string> = { positive: "긍정", neutral: "중립", negative: "부정" };

const CONFIDENCE_VAR: Record<string, string> = {
  high: "--success",
  medium: "--accent",
  low: "--muted-foreground",
};
const CONFIDENCE_LABEL: Record<string, string> = { high: "높음", medium: "보통", low: "낮음" };

function tooltipStyle() {
  return {
    background: "hsl(var(--popover))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 8,
    fontSize: 12,
    color: "hsl(var(--popover-foreground))",
  };
}

export default function AdminAnalyticsPage() {
  const { data, isLoading } = useAdminNewsListQuery({ pageSize: 200 });
  const items = data?.items ?? [];
  const resolvedColors = useCssVarColors(["--success", "--muted-foreground", "--destructive", "--accent"]);

  const sentimentData = React.useMemo(() => {
    const counts: Record<"positive" | "neutral" | "negative", number> = { positive: 0, neutral: 0, negative: 0 };
    items.forEach((n) => counts[n.sentiment]++);
    return Object.entries(counts).map(([key, value]) => ({ key, name: SENTIMENT_LABEL[key], value }));
  }, [items]);

  const confidenceData = React.useMemo(() => {
    const counts: Record<"high" | "medium" | "low", number> = { high: 0, medium: 0, low: 0 };
    items.forEach((n) => counts[n.aiConfidence]++);
    return Object.entries(counts).map(([key, value]) => ({ key, name: CONFIDENCE_LABEL[key], value }));
  }, [items]);

  const importanceData = React.useMemo(() => {
    const counts = [1, 2, 3, 4, 5].map((score) => ({
      score: `${score}점`,
      count: items.filter((n) => n.aiImportance === score).length,
    }));
    return counts;
  }, [items]);

  if (isLoading) {
    return (
      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-72 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-page-title">AI 분석</h1>
        <p className="mt-1 text-sm text-muted-foreground">등록된 전체 기사에 대한 AI 분석 결과 분포입니다. (총 {items.length}건)</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">감정 분석 분포</CardTitle>
          </CardHeader>
          <CardContent className="h-64 pt-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={sentimentData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                  {sentimentData.map((entry) => (
                    <Cell key={entry.key} fill={resolvedColors[SENTIMENT_VAR[entry.key] ?? ""] ?? "hsl(var(--muted-foreground))"} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle()} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">확신도 분포</CardTitle>
          </CardHeader>
          <CardContent className="h-64 pt-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={confidenceData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                  {confidenceData.map((entry) => (
                    <Cell key={entry.key} fill={resolvedColors[CONFIDENCE_VAR[entry.key] ?? ""] ?? "hsl(var(--muted-foreground))"} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle()} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">AI 중요도 분포</CardTitle>
          </CardHeader>
          <CardContent className="h-64 pt-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={importanceData} margin={{ left: -20, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="score" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
                <Tooltip cursor={{ fill: "hsl(var(--muted))" }} contentStyle={tooltipStyle()} formatter={(v) => [`${v}건`, "기사 수"]} />
                <Bar dataKey="count" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
