"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import type { News } from "@/lib/schemas/news.schema";
import { CategoryBadge } from "@/components/news/category-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function AiPicksPanel({ items, isLoading }: { items?: News[]; isLoading?: boolean }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-accent" /> AI 추천 뉴스
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 pt-0">
        {isLoading &&
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        {!isLoading &&
          items?.map((item, i) => (
            <Link
              key={item.id}
              href={`/news/${item.id}`}
              className="flex items-start gap-2.5 rounded-lg px-1.5 py-2 transition-colors hover:bg-muted/60"
            >
              <span className="mt-0.5 text-sm font-extrabold tabular-nums text-accent">{String(i + 1).padStart(2, "0")}</span>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-xs font-semibold leading-snug text-foreground">{item.title}</p>
                <CategoryBadge categoryId={item.categoryId} className="mt-1" />
              </div>
            </Link>
          ))}
      </CardContent>
    </Card>
  );
}
