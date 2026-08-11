"use client";

import Link from "next/link";
import { Eye } from "lucide-react";
import type { News } from "@/lib/schemas/news.schema";
import { relativeTime, formatCount } from "@/lib/format";
import { NewsThumbnail } from "@/components/news/news-thumbnail";
import { CategoryBadge } from "@/components/news/category-badge";
import { AiImportance } from "@/components/news/ai-importance";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

export function FeaturedArticle({ item }: { item: News }) {
  return (
    <Link
      href={`/news/${item.id}`}
      className="group grid overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-shadow duration-300 hover:shadow-card-hover sm:grid-cols-2"
    >
      <NewsThumbnail
        categoryId={item.categoryId}
        gradient={item.thumbnailGradient}
        imageUrl={item.imageUrl}
        size="lg"
        className="aspect-[16/10] sm:aspect-auto sm:h-full"
      />
      <div className="flex flex-col gap-3 p-6">
        <div className="flex items-center gap-2">
          <Badge variant="accent" className="gap-1">
            <Sparkles className="h-3 w-3" /> 오늘의 주요뉴스
          </Badge>
          <CategoryBadge categoryId={item.categoryId} />
        </div>
        <h2 className="text-xl font-extrabold leading-tight tracking-tight text-foreground transition-colors group-hover:text-primary sm:text-2xl">
          {item.title}
        </h2>
        <ul className="space-y-1.5">
          {item.summaryBullets.map((line, i) => (
            <li key={i} className="text-sm leading-relaxed text-muted-foreground">
              · {line}
            </li>
          ))}
        </ul>
        <div className="mt-auto flex items-center gap-2 pt-2">
          <AiImportance score={item.aiImportance} />
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs font-medium text-foreground/80">{item.publisher}</span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">{relativeTime(item.publishedAt)}</span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
            <Eye className="h-3 w-3" /> {formatCount(item.viewCount)}
          </span>
        </div>
      </div>
    </Link>
  );
}
