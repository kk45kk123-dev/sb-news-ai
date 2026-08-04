import Link from "next/link";
import type { ArticleDto } from "@/server/services/article.service";
import { ImpactMeter } from "@/components/ui/ImpactMeter";
import { CategoryChip } from "@/components/ui/CategoryChip";
import { ConfidenceBadge } from "@/components/ui/ConfidenceBadge";
import { SummaryLines } from "./SummaryLines";
import { BookmarkButton } from "./BookmarkButton";
import { formatRelativeTime } from "@/lib/date";

export function NewsCard({ article }: { article: ArticleDto }) {
  const readClass = article.isRead ? "opacity-60" : "";

  return (
    <article
      className={`rounded-lg border border-border bg-bg p-4 shadow-sm transition hover:shadow-md ${readClass}`}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-text-subtle">
        {article.analysis ? (
          <ImpactMeter score={article.analysis.sbImpactScore} direction={article.analysis.sbImpactDirection} size="sm" />
        ) : (
          <span className="rounded-sm bg-bg-subtle px-2 py-0.5 font-medium text-text-subtle">
            AI 분석 대기
          </span>
        )}
        {article.categories[0] && <CategoryChip label={article.categories[0].name} />}
        <span>{article.source.name}</span>
        <span>{formatRelativeTime(new Date(article.publishedAt))}</span>
        {article.analysis && article.analysis.confidence === "low" && (
          <ConfidenceBadge level={article.analysis.confidence} />
        )}
        <span className="ml-auto">
          <BookmarkButton articleId={article.id} initialBookmarked={article.isBookmarked} />
        </span>
      </div>

      <h3 className="mb-2 text-base font-semibold text-text">
        <Link href={`/news/${article.id}`} className="hover:underline">
          {article.title}
        </Link>
      </h3>

      {article.analysis ? (
        <>
          <SummaryLines lines={article.analysis.summaryLines} />
          {article.analysis.aiComment && (
            <p className="mt-2 rounded-sm bg-bg-ai px-2 py-1.5 text-sm text-navy-700">
              💡 {article.analysis.aiComment}
            </p>
          )}
          {article.analysis.keywords.length > 0 && (
            <p className="mt-2 text-xs text-text-subtle">
              {article.analysis.keywords.map((k) => `#${k}`).join(" ")}
            </p>
          )}
        </>
      ) : (
        article.description && <p className="text-sm text-text-muted">{article.description}</p>
      )}

      <div className="mt-2">
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:underline"
        >
          원문 보기 ↗
        </a>
      </div>
    </article>
  );
}
