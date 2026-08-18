"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useNewsListQuery } from "@/lib/query/use-news";
import { useCategories } from "@/context/categories-context";
import { FeaturedArticle } from "@/components/home/featured-article";
import { MarketBriefing } from "@/components/home/market-briefing";
import { EconomicCalendar } from "@/components/home/economic-calendar";
import { TodayBriefing } from "@/components/home/today-briefing";
import { NewsGrid } from "@/components/news/news-grid";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * page.tsx(서버 컴포넌트)가 featured/latest 뉴스와 시장 스냅샷을 미리 fetch해
 * HydrationBoundary로 감싸 내려준다 — 여기 useNewsListQuery 등은 그 프리페치와
 * 정확히 같은 queryKey를 쓰기만 하면 최초 렌더에서 네트워크 요청 없이 바로
 * 캐시를 읽는다(TanStack Query 하이드레이션). 이후 상호작용에 따른 리페치는
 * 평소처럼 클라이언트에서 일어난다.
 */
export function HomeContent() {
  const categories = useCategories();
  const { data: featuredData, isLoading: featuredLoading } = useNewsListQuery({ sort: "impact", pageSize: 1 });
  const { data: latestData, isLoading: latestLoading } = useNewsListQuery({ sort: "latest", pageSize: 6 });

  const featured = featuredData?.items[0];

  return (
    <div className="container space-y-10 py-8">
      <section>
        {featuredLoading || !featured ? (
          <Skeleton className="aspect-[16/9] w-full rounded-2xl sm:aspect-[2/1]" />
        ) : (
          <FeaturedArticle item={featured} />
        )}

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <MarketBriefing />
          <EconomicCalendar />
        </div>
      </section>

      <TodayBriefing />

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight">오늘의 뉴스</h2>
          <Link href="/news" className="flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80">
            전체보기 <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/news?category=${c.id}`}
              className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              {c.name}
            </Link>
          ))}
        </div>

        <NewsGrid items={latestData?.items} isLoading={latestLoading} />
      </section>
    </div>
  );
}
