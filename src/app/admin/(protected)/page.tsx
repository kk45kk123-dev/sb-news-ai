"use client";

import Link from "next/link";
import { toast } from "sonner";
import { Clock, RefreshCw, Sparkles } from "lucide-react";
import { useDashboardStatsQuery, useAdminNewsListQuery, useRegenerateBriefingMutation } from "@/lib/query/use-admin";
import { useTodayBriefingQuery } from "@/lib/query/use-briefing";
import { relativeTime, formatCount } from "@/lib/format";
import { WeeklyTrendChart } from "@/components/admin/weekly-trend-chart";
import { CategoryDistributionChart } from "@/components/admin/category-distribution-chart";
import { CategoryBadge } from "@/components/news/category-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function AdminDashboardPage() {
  const { data: stats } = useDashboardStatsQuery();
  const { data: recentNews } = useAdminNewsListQuery({ sort: "latest", pageSize: 5 });
  const { data: popularNews } = useAdminNewsListQuery({ sort: "views", pageSize: 5 });
  const { data: briefing } = useTodayBriefingQuery();
  const regenerateBriefing = useRegenerateBriefingMutation();

  function handleRegenerateBriefing() {
    regenerateBriefing.mutate(undefined, {
      onSuccess: () => toast.success("브리핑을 재생성했습니다."),
      onError: (err) => toast.error(err instanceof Error ? err.message : "브리핑 생성에 실패했습니다."),
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-page-title">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">오늘의 SB NEWS AI 운영 현황입니다.</p>
      </div>

      {stats && (
        <div className="grid gap-4 lg:grid-cols-2">
          <WeeklyTrendChart data={stats.weeklyTrend} />
          <CategoryDistributionChart data={stats.categoryCounts} />
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" /> 오늘의 브리핑
          </CardTitle>
          <Button size="sm" variant="outline" onClick={handleRegenerateBriefing} disabled={regenerateBriefing.isPending}>
            <RefreshCw className={cn("h-3.5 w-3.5", regenerateBriefing.isPending && "animate-spin")} /> 재생성
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          {briefing ? (
            <div className="space-y-1">
              <p className="line-clamp-2 text-sm text-muted-foreground">{briefing.overview}</p>
              <p className="text-[11px] text-muted-foreground">
                최근 생성: {relativeTime(briefing.generatedAt)} · 기사 {briefing.items.length}건
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              오늘 생성된 브리핑이 없습니다. 재생성 버튼을 눌러 최근 24시간 기사로 브리핑을 만들어보세요.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">인기 기사</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 pt-0">
            {popularNews?.items.map((n, i) => (
              <Link key={n.id} href={`/news/${n.id}`} className="flex items-start gap-2 rounded-lg px-1.5 py-2 hover:bg-muted/60">
                <span className="mt-0.5 text-xs font-extrabold tabular-nums text-accent">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-xs font-semibold">{n.title}</p>
                  <p className="text-[11px] text-muted-foreground">{formatCount(n.viewCount)} 조회</p>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">최근 등록 기사</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 pt-0">
            {recentNews?.items.map((n) => {
              return (
                <Link key={n.id} href={`/news/${n.id}`} className="block rounded-lg px-1.5 py-2 hover:bg-muted/60">
                  <div className="mb-1 flex items-center gap-1.5">
                    <CategoryBadge categoryId={n.categoryId} />
                    <span className="text-[11px] text-muted-foreground">{relativeTime(n.publishedAt)}</span>
                  </div>
                  <p className="line-clamp-1 text-xs font-semibold">{n.title}</p>
                  <p className="text-[11px] text-muted-foreground">{n.publisher}</p>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">최근 로그인</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {stats?.recentLogins.map((login) => (
              <div key={login.id} className="flex items-center gap-2.5 px-1.5 py-1.5">
                <Avatar className="h-7 w-7 text-xs">
                  <AvatarFallback>{login.name.slice(0, 1)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold">{login.name}</p>
                  <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock className="h-2.5 w-2.5" /> {relativeTime(login.at)}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
