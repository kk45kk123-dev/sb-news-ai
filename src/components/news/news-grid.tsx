import { Newspaper, type LucideIcon } from "lucide-react";
import type { News } from "@/lib/schemas/news.schema";
import { NewsCard } from "@/components/news/news-card";
import { NewsCardSkeleton } from "@/components/news/news-card-skeleton";

interface NewsGridProps {
  items?: News[];
  isLoading?: boolean;
  skeletonCount?: number;
  emptyMessage?: string;
  emptyIcon?: LucideIcon;
}

export function NewsGrid({
  items,
  isLoading,
  skeletonCount = 6,
  emptyMessage = "조건에 맞는 뉴스가 없습니다.",
  emptyIcon: EmptyIcon = Newspaper,
}: NewsGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <NewsCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-24 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <EmptyIcon className="h-6 w-6 text-muted-foreground" strokeWidth={1.75} />
        </div>
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <NewsCard key={item.id} item={item} />
      ))}
    </div>
  );
}
