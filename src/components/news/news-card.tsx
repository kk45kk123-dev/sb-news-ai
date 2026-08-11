"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Eye, ArrowUpRight } from "lucide-react";
import type { News } from "@/lib/schemas/news.schema";
import { relativeTime, formatCount } from "@/lib/format";
import { MOTION } from "@/lib/motion";
import { NewsThumbnail } from "@/components/news/news-thumbnail";
import { CategoryBadge } from "@/components/news/category-badge";
import { AiImportance } from "@/components/news/ai-importance";
import { LikeButton } from "@/components/news/like-button";
import { BookmarkButton } from "@/components/news/bookmark-button";
import { ShareButton } from "@/components/news/share-button";

export function NewsCard({ item }: { item: News }) {
  return (
    <motion.article
      initial={false}
      whileHover={{ y: -3 }}
      transition={MOTION.hover}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card transition-[box-shadow,border-color] duration-[220ms] ease-out hover:border-border/60 hover:shadow-card-hover"
    >
      <Link href={`/news/${item.id}`} className="flex flex-1 flex-col">
        <div className="overflow-hidden">
          <NewsThumbnail
            categoryId={item.categoryId}
            gradient={item.thumbnailGradient}
            imageUrl={item.imageUrl}
            className="aspect-[16/9] w-full transition-transform duration-[220ms] ease-out group-hover:scale-[1.03]"
          />
        </div>
        {/* Fixed content block height keeps every card in a row the same
            size regardless of title/summary length, so the grid reads as
            a clean rhythm instead of a jagged staircase. */}
        <div className="flex flex-1 flex-col gap-4 p-5">
          <div className="flex items-center justify-between gap-2">
            <CategoryBadge categoryId={item.categoryId} />
            <AiImportance score={item.aiImportance} />
          </div>

          <h3 className="line-clamp-2 min-h-[2.6em] text-card-title transition-colors duration-[220ms] group-hover:text-primary">
            {item.title}
          </h3>

          <ul className="space-y-1.5">
            {item.summaryBullets.slice(0, 2).map((line, i) => (
              <li key={i} className="line-clamp-1 text-caption">
                <span className="mr-1 text-muted-foreground/50">·</span>
                {line}
              </li>
            ))}
          </ul>

          <div className="mt-auto flex items-center gap-2 pt-1 text-meta">
            <span className="font-semibold text-foreground/80">{item.publisher}</span>
            <span className="text-border">·</span>
            <span>{relativeTime(item.publishedAt)}</span>
            <span className="text-border">·</span>
            <span className="flex items-center gap-1 tabular-nums">
              <Eye className="h-3 w-3" /> {formatCount(item.viewCount)}
            </span>
          </div>
        </div>
      </Link>

      <div className="flex items-center justify-between border-t border-border px-5 py-3">
        <div className="flex items-center gap-4">
          <LikeButton newsId={item.id} likeCount={item.likeCount} />
          <BookmarkButton newsId={item.id} />
          <ShareButton title={item.title} path={`/news/${item.id}`} />
        </div>
        <Link
          href={`/news/${item.id}`}
          className="flex items-center gap-0.5 text-[12.5px] font-semibold text-primary transition-colors duration-[220ms] hover:text-primary/80"
        >
          기사보기 <ArrowUpRight className="h-3 w-3 transition-transform duration-[220ms] group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </div>
    </motion.article>
  );
}
