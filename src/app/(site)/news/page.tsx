"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { CATEGORIES, getCategoryById } from "@/data/categories";
import { useInfiniteNewsListQuery, useAiRecommendedNewsQuery } from "@/lib/query/use-news";
import { NewsGrid } from "@/components/news/news-grid";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { NewsListParams } from "@/lib/schemas/news.schema";

const SORT_TABS: { value: NewsListParams["sort"]; label: string }[] = [
  { value: "latest", label: "최신순" },
  { value: "views", label: "조회수순" },
  { value: "impact", label: "영향도순" },
];

export default function NewsListPage() {
  return (
    <React.Suspense fallback={null}>
      <NewsListPageContent />
    </React.Suspense>
  );
}

function NewsListPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryId = searchParams.get("category") ?? undefined;
  const sort = (searchParams.get("sort") as NewsListParams["sort"] | null) ?? "latest";
  const aiOnly = searchParams.get("ai") === "1";

  const category = categoryId ? getCategoryById(categoryId) : undefined;

  function updateParams(next: { category?: string | null; sort?: string | null; ai?: string | null }) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value === null || value === undefined) params.delete(key);
      else params.set(key, value);
    }
    router.push(`/news?${params.toString()}`);
  }

  const infiniteQuery = useInfiniteNewsListQuery({ categoryId, sort, pageSize: 9 });
  const aiQuery = useAiRecommendedNewsQuery(30);

  const items = aiOnly ? aiQuery.data : infiniteQuery.data?.pages.flatMap((p) => p.items);
  const isLoading = aiOnly ? aiQuery.isLoading : infiniteQuery.isLoading;

  return (
    <div className="container space-y-6 py-8">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">
          {aiOnly ? "AI 추천 뉴스" : category ? category.name : "전체 뉴스"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {aiOnly ? "AI가 저축은행 업권 영향도를 기준으로 선별한 뉴스입니다." : "저축은행 산업과 관련된 경제뉴스를 한눈에 확인하세요."}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => updateParams({ category: null, ai: null })}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
            !categoryId && !aiOnly ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary/40"
          )}
        >
          전체
        </button>
        <button
          onClick={() => updateParams({ ai: "1", category: null })}
          className={cn(
            "flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
            aiOnly ? "border-accent bg-accent text-accent-foreground" : "border-border text-muted-foreground hover:border-accent/40"
          )}
        >
          <Sparkles className="h-3 w-3" /> AI 추천
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => updateParams({ category: c.id, ai: null })}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
              categoryId === c.id ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary/40"
            )}
          >
            {c.name}
          </button>
        ))}
      </div>

      {!aiOnly && (
        <div className="inline-flex items-center gap-1 rounded-lg bg-muted p-1">
          {SORT_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => updateParams({ sort: tab.value })}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                sort === tab.value ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <NewsGrid items={items} isLoading={isLoading} skeletonCount={9} />

      {!aiOnly && infiniteQuery.hasNextPage && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            onClick={() => infiniteQuery.fetchNextPage()}
            disabled={infiniteQuery.isFetchingNextPage}
          >
            {infiniteQuery.isFetchingNextPage ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            더보기
          </Button>
        </div>
      )}
    </div>
  );
}
