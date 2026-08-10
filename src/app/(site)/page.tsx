"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useNewsListQuery } from "@/lib/query/use-news";
import { CATEGORIES } from "@/data/categories";
import { FeaturedArticle } from "@/components/home/featured-article";
import { MarketBriefing } from "@/components/home/market-briefing";
import { EconomicCalendar } from "@/components/home/economic-calendar";
import { TodayBriefing } from "@/components/home/today-briefing";
import { NewsGrid } from "@/components/news/news-grid";
import { Skeleton } from "@/components/ui/skeleton";

export default function HomePage() {
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
          {CATEGORIES.map((c) => (
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
