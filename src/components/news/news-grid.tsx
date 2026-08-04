import { Newspaper } from "lucide-react";
import type { News } from "@/lib/schemas/news.schema";
import { NewsCard } from "@/components/news/news-card";
import { NewsCardSkeleton } from "@/components/news/news-card-skeleton";

interface NewsGridProps {
  items?: News[];
  isLoading?: boolean;
  skeletonCount?: number;
  emptyMessage?: string;
}

export function NewsGrid({ items, isLoading, skeletonCount = 6, emptyMessage = "조건에 맞는 뉴스가 없습니다." }: NewsGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <NewsCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-20 text-center">
        <Newspaper className="h-9 w-9 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <NewsCard key={item.id} item={item} />
      ))}
    </div>
  );
}
