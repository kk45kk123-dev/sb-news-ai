"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Search as SearchIcon } from "lucide-react";
import { CATEGORIES } from "@/data/categories";
import { useSearchQuery, usePublisherListQuery } from "@/lib/query/use-search";
import { SearchBar } from "@/components/search/search-bar";
import { NewsGrid } from "@/components/news/news-grid";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const DATE_PRESETS = [
  { id: "all", label: "전체 기간", days: null },
  { id: "today", label: "오늘", days: 1 },
  { id: "week", label: "이번주", days: 7 },
  { id: "month", label: "이번달", days: 30 },
] as const;

export default function SearchPage() {
  return (
    <React.Suspense fallback={null}>
      <SearchPageContent />
    </React.Suspense>
  );
}

function SearchPageContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";

  const [categoryId, setCategoryId] = React.useState<string>("all");
  const [publisher, setPublisher] = React.useState<string>("all");
  const [datePreset, setDatePreset] = React.useState<(typeof DATE_PRESETS)[number]["id"]>("all");

  const preset = DATE_PRESETS.find((p) => p.id === datePreset)!;
  const dateFrom = preset.days ? new Date(Date.now() - preset.days * 86400000).toISOString() : undefined;

  const { data: publishers } = usePublisherListQuery();
  const { data, isLoading } = useSearchQuery({
    query,
    categoryId: categoryId === "all" ? undefined : categoryId,
    publisher: publisher === "all" ? undefined : publisher,
    dateFrom,
    pageSize: 24,
  });

  return (
    <div className="container max-w-4xl space-y-6 py-8">
      <div>
        <h1 className="mb-4 text-page-title">검색</h1>
        <SearchBar autoFocus={!query} />
      </div>

      {query ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="카테고리" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 카테고리</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={publisher} onValueChange={setPublisher}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="언론사" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 언론사</SelectItem>
                {publishers?.map((p) => (
                  <SelectItem key={p.publisher} value={p.publisher}>
                    {p.publisher} ({p.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="inline-flex items-center gap-1 rounded-lg bg-muted p-1">
              {DATE_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setDatePreset(p.id)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                    datePreset === p.id ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-4 text-sm text-muted-foreground">
              &ldquo;<span className="font-semibold text-foreground">{query}</span>&rdquo; 검색 결과 {data ? `${data.total}건` : ""}
            </p>
            <NewsGrid
              items={data?.items}
              isLoading={isLoading}
              skeletonCount={6}
              emptyMessage="검색 결과가 없습니다. 다른 키워드로 시도해보세요."
              emptyIcon={SearchIcon}
            />
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-24 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <SearchIcon className="h-6 w-6 text-muted-foreground" strokeWidth={1.75} />
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">키워드를 입력해 뉴스를 검색해보세요.</p>
        </div>
      )}
    </div>
  );
}
