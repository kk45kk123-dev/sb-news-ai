"use client";

import Link from "next/link";
import { Newspaper, Eye, BrainCircuit, ScanSearch, Clock } from "lucide-react";
import { useDashboardStatsQuery, useAdminNewsListQuery } from "@/lib/query/use-admin";
import { getMediaById } from "@/data/media";
import { relativeTime, formatCount } from "@/lib/format";
import { StatCard } from "@/components/admin/stat-card";
import { WeeklyTrendChart } from "@/components/admin/weekly-trend-chart";
import { CategoryDistributionChart } from "@/components/admin/category-distribution-chart";
import { CategoryBadge } from "@/components/news/category-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function AdminDashboardPage() {
  const { data: stats, isLoading } = useDashboardStatsQuery();
  const { data: recentNews } = useAdminNewsListQuery({ sort: "latest", pageSize: 5 });
  const { data: popularNews } = useAdminNewsListQuery({ sort: "views", pageSize: 5 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-page-title">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">오늘의 SB NEWS AI 운영 현황입니다.</p>
      </div>

      {isLoading || !stats ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={Newspaper} label="오늘 등록 뉴스" value={`${stats.todayNewsCount}건`} delta={stats.todayNewsDelta} />
          <StatCard icon={Eye} label="총 조회수" value={formatCount(stats.totalViews)} delta={stats.totalViewsDelta} />
          <StatCard icon={BrainCircuit} label="AI 분석 비율" value={`${stats.aiAnalysisRate}%`} />
          <StatCard icon={ScanSearch} label="스크랩 성공률" value={`${stats.scrapSuccessRate}%`} />
        </div>
      )}

      {stats && (
        <div className="grid gap-4 lg:grid-cols-2">
          <WeeklyTrendChart data={stats.weeklyTrend} />
          <CategoryDistributionChart data={stats.categoryCounts} />
        </div>
      )}

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
              const media = getMediaById(n.mediaId);
              return (
                <Link key={n.id} href={`/news/${n.id}`} className="block rounded-lg px-1.5 py-2 hover:bg-muted/60">
                  <div className="mb-1 flex items-center gap-1.5">
                    <CategoryBadge categoryId={n.categoryId} />
                    <span className="text-[11px] text-muted-foreground">{relativeTime(n.publishedAt)}</span>
                  </div>
                  <p className="line-clamp-1 text-xs font-semibold">{n.title}</p>
                  <p className="text-[11px] text-muted-foreground">{media?.name}</p>
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
