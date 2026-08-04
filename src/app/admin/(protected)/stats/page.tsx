"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useDashboardStatsQuery } from "@/lib/query/use-admin";
import { useAdminNewsListQuery } from "@/lib/query/use-admin";
import { MEDIA_OUTLETS } from "@/data/media";
import { WeeklyTrendChart } from "@/components/admin/weekly-trend-chart";
import { CategoryDistributionChart } from "@/components/admin/category-distribution-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminStatsPage() {
  const { data: stats, isLoading } = useDashboardStatsQuery();
  const { data: newsList } = useAdminNewsListQuery({ pageSize: 200 });

  const mediaData = React.useMemo(() => {
    if (!newsList) return [];
    return MEDIA_OUTLETS.map((m) => ({
      name: m.name,
      count: newsList.items.filter((n) => n.mediaId === m.id).length,
    })).sort((a, b) => b.count - a.count);
  }, [newsList]);

  if (isLoading || !stats) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-72 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">통계</h1>
        <p className="mt-1 text-sm text-muted-foreground">서비스 전반의 콘텐츠 통계를 확인합니다.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <WeeklyTrendChart data={stats.weeklyTrend} />
        <CategoryDistributionChart data={stats.categoryCounts} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">언론사별 기사 수</CardTitle>
        </CardHeader>
        <CardContent className="h-64 pt-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={mediaData} margin={{ left: -20, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))" }}
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "hsl(var(--popover-foreground))",
                }}
                formatter={(v) => [`${v}건`, "기사 수"]}
              />
              <Bar dataKey="count" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
