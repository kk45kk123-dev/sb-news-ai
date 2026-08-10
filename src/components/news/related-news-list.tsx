"use client";

import Link from "next/link";
import { Eye } from "lucide-react";
import type { News } from "@/lib/schemas/news.schema";
import { relativeTime, formatCount } from "@/lib/format";
import { NewsThumbnail } from "@/components/news/news-thumbnail";
import { CategoryBadge } from "@/components/news/category-badge";
import { Skeleton } from "@/components/ui/skeleton";

interface RelatedNewsListProps {
  title: string;
  items?: News[];
  isLoading?: boolean;
}

export function RelatedNewsList({ title, items, isLoading }: RelatedNewsListProps) {
  if (!isLoading && (!items || items.length === 0)) return null;

  return (
    <section>
      <h2 className="mb-4 text-[15px] font-bold tracking-tight text-foreground">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {isLoading &&
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        {!isLoading &&
          items?.map((item) => {
            return (
              <Link
                key={item.id}
                href={`/news/${item.id}`}
                className="group flex gap-4 rounded-xl border border-border bg-card p-4 shadow-soft transition-shadow duration-[220ms] ease-out hover:shadow-card-hover"
              >
                <NewsThumbnail categoryId={item.categoryId} gradient={item.thumbnailGradient} className="h-20 w-24 shrink-0" />
                <div className="min-w-0 flex-1">
                  <CategoryBadge categoryId={item.categoryId} />
                  <p className="mt-1.5 line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors duration-[220ms] group-hover:text-primary">
                    {item.title}
                  </p>
                  <div className="mt-1.5 flex items-center gap-1.5 text-meta">
                    <span>{item.publisher}</span>
                    <span className="text-border">·</span>
                    <span>{relativeTime(item.publishedAt)}</span>
                    <span className="text-border">·</span>
                    <span className="flex items-center gap-0.5 tabular-nums">
                      <Eye className="h-2.5 w-2.5" /> {formatCount(item.viewCount)}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
      </div>
    </section>
  );
}
