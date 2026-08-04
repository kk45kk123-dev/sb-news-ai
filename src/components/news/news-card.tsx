"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Eye, ArrowUpRight } from "lucide-react";
import type { News } from "@/lib/schemas/news.schema";
import { getMediaById } from "@/data/media";
import { relativeTime, formatCount } from "@/lib/format";
import { NewsThumbnail } from "@/components/news/news-thumbnail";
import { CategoryBadge } from "@/components/news/category-badge";
import { AiImportance } from "@/components/news/ai-importance";
import { LikeButton } from "@/components/news/like-button";
import { BookmarkButton } from "@/components/news/bookmark-button";
import { ShareButton } from "@/components/news/share-button";

export function NewsCard({ item }: { item: News }) {
  const media = getMediaById(item.mediaId);

  return (
    <motion.article
      initial={false}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card transition-shadow duration-300 hover:shadow-card-hover"
    >
      <Link href={`/news/${item.id}`} className="flex flex-1 flex-col">
        <NewsThumbnail categoryId={item.categoryId} gradient={item.thumbnailGradient} className="aspect-[16/9] w-full" />
        <div className="flex flex-1 flex-col gap-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <CategoryBadge categoryId={item.categoryId} />
            <AiImportance score={item.aiImportance} />
          </div>

          <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-foreground transition-colors group-hover:text-primary">
            {item.title}
          </h3>

          <ul className="space-y-1">
            {item.summaryBullets.slice(0, 2).map((line, i) => (
              <li key={i} className="line-clamp-1 text-xs leading-relaxed text-muted-foreground">
                · {line}
              </li>
            ))}
          </ul>

          <div className="mt-auto flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="font-medium text-foreground/80">{media?.name}</span>
            <span>·</span>
            <span>{relativeTime(item.publishedAt)}</span>
            <span>·</span>
            <span className="flex items-center gap-0.5">
              <Eye className="h-3 w-3" /> {formatCount(item.viewCount)}
            </span>
          </div>
        </div>
      </Link>

      <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
        <div className="flex items-center gap-3">
          <LikeButton newsId={item.id} likeCount={item.likeCount} />
          <BookmarkButton newsId={item.id} />
          <ShareButton title={item.title} path={`/news/${item.id}`} />
        </div>
        <Link
          href={`/news/${item.id}`}
          className="flex items-center gap-0.5 text-xs font-semibold text-primary transition-colors hover:text-primary/80"
        >
          기사보기 <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
    </motion.article>
  );
}
