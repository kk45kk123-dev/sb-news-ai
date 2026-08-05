"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, Eye, Info, Newspaper, Sparkles } from "lucide-react";
import { getMediaById } from "@/data/media";
import { relativeTime, formatCount } from "@/lib/format";
import { incrementView } from "@/lib/api/news";
import { useNewsDetailQuery, useRelatedNewsQuery, useSameTopicNewsQuery } from "@/lib/query/use-news";
import { annotate } from "@/lib/annotate";
import { NewsThumbnail } from "@/components/news/news-thumbnail";
import { CategoryBadge } from "@/components/news/category-badge";
import { AiImportance } from "@/components/news/ai-importance";
import { SentimentBadge } from "@/components/news/sentiment-badge";
import { ConfidenceBadge } from "@/components/news/confidence-badge";
import { ImpactMeter } from "@/components/news/impact-meter";
import { ArticleBody } from "@/components/news/article-body";
import { LikeButton } from "@/components/news/like-button";
import { BookmarkButton } from "@/components/news/bookmark-button";
import { ShareButton } from "@/components/news/share-button";
import { RelatedNewsList } from "@/components/news/related-news-list";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserActivity } from "@/context/user-activity-context";
import { cn } from "@/lib/utils";

export default function NewsDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const { data: news, isLoading } = useNewsDetailQuery(id);
  const { data: related, isLoading: relatedLoading } = useRelatedNewsQuery(id);
  const { data: sameTopic, isLoading: sameTopicLoading } = useSameTopicNewsQuery(id);
  const { addRecentlyViewed } = useUserActivity();

  const [analysisOpen, setAnalysisOpen] = React.useState(false);
  const viewedRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!id || viewedRef.current === id) return;
    viewedRef.current = id;
    incrementView(id).catch(() => {
      // Best-effort — a failed view-count bump (e.g. the article was deleted
      // between page load and this call) shouldn't surface to the reader.
    });
    addRecentlyViewed(id);
  }, [id, addRecentlyViewed]);

  if (isLoading) {
    return (
      <div className="container max-w-3xl space-y-8 py-8">
        <Skeleton className="h-5 w-20" />
        <div className="space-y-4">
          <Skeleton className="aspect-[2/1] w-full rounded-2xl" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-9 w-[85%]" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="mx-auto w-full max-w-[640px] space-y-8">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[92%]" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[70%]" />
          </div>
        </div>
      </div>
    );
  }

  if (!news) {
    return (
      <div className="container max-w-3xl py-8">
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-24 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Newspaper className="h-6 w-6 text-muted-foreground" strokeWidth={1.75} />
          </div>
          <div className="space-y-1">
            <p className="text-base font-bold text-foreground">기사를 찾을 수 없습니다</p>
            <p className="text-sm text-muted-foreground">삭제되었거나 잘못된 주소일 수 있습니다.</p>
          </div>
          <Link
            href="/news"
            className="mt-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors duration-[220ms] hover:bg-primary/90"
          >
            전체 뉴스로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  const media = getMediaById(news.mediaId);

  return (
    <div className="container max-w-3xl space-y-8 py-8">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> 목록으로
      </button>

      <div>
        <NewsThumbnail categoryId={news.categoryId} gradient={news.thumbnailGradient} size="lg" className="aspect-[2/1] w-full" />

        <div className="mt-5 flex items-center gap-2">
          <CategoryBadge categoryId={news.categoryId} />
          {news.isAiRecommended && (
            <Badge variant="accent" className="gap-1">
              <Sparkles className="h-3 w-3" /> AI 추천
            </Badge>
          )}
        </div>

        <h1 className="mt-4 text-article-title">{news.title}</h1>

        <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-meta">
          <span className="font-semibold text-foreground">{media?.name}</span>
          <span className="text-border">·</span>
          <span>{news.reporter}</span>
          <span className="text-border">·</span>
          <span>{relativeTime(news.publishedAt)}</span>
          <span className="text-border">·</span>
          <span className="flex items-center gap-1 tabular-nums">
            <Eye className="h-3.5 w-3.5" /> 조회 {formatCount(news.viewCount)}
          </span>
        </div>

        <div className="mt-5 flex items-center gap-4 border-y border-border py-3">
          <LikeButton newsId={news.id} likeCount={news.likeCount} size="md" />
          <BookmarkButton newsId={news.id} size="md" />
          <ShareButton title={news.title} path={`/news/${news.id}`} size="md" />
        </div>
      </div>

      {/* Narrower column than the page container — a hero image and meta
          row read fine full-width, but a 65-75 character line length is
          what keeps long-form Korean text comfortable to read. */}
      <div className="mx-auto w-full max-w-[640px] space-y-8">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="mb-4 flex items-center gap-2">
            <Badge variant="accent" className="gap-1">
              <Sparkles className="h-3 w-3" /> AI 3줄 요약
            </Badge>
            <AiImportance score={news.aiImportance} />
          </div>
          <ul className="space-y-2">
            {news.summaryBullets.map((line, i) => (
              <li key={i} className="flex gap-2 text-[15px] leading-relaxed text-foreground">
                <span className="text-primary">·</span>
                <span>{annotate(line)}</span>
              </li>
            ))}
          </ul>

          <button
            onClick={() => setAnalysisOpen((v) => !v)}
            className="mt-5 flex items-center gap-1 text-sm font-semibold text-primary transition-colors duration-[220ms] hover:text-primary/80"
            aria-expanded={analysisOpen}
          >
            {analysisOpen ? "AI 상세분석 접기" : "AI 상세분석 더보기"}
            <ChevronDown className={cn("h-4 w-4 transition-transform duration-[250ms] ease-out", analysisOpen && "rotate-180")} />
          </button>

          <div
            className={cn(
              "grid overflow-hidden transition-[grid-template-rows] duration-[250ms] ease-out",
              analysisOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
            )}
          >
            <div className="min-h-0">
              <div className="mt-5 space-y-3 border-t border-border pt-5">
                <ImpactMeter label="금융 영향도" score={news.financialImpact} />
                <ImpactMeter label="저축은행 영향도" score={news.savingsBankImpact} />
                <div className="flex items-center gap-2 pt-1">
                  <SentimentBadge sentiment={news.sentiment} />
                  <ConfidenceBadge confidence={news.aiConfidence} />
                </div>
              </div>
            </div>
          </div>
        </section>

        <article>
          <ArticleBody text={news.body} />
        </article>

        <div className="flex flex-wrap gap-2">
          {news.keywords.map((kw) => (
            <Link
              key={kw}
              href={`/search?q=${encodeURIComponent(kw)}`}
              className="rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors duration-[220ms] hover:bg-muted/70 hover:text-foreground"
            >
              #{kw}
            </Link>
          ))}
        </div>

        <div className="flex gap-3 rounded-xl bg-muted p-4 text-caption">
          <Info className="h-4 w-4 shrink-0 text-muted-foreground" />
          <p>본 분석은 AI가 기사 본문을 해석해 생성한 참고 자료이며, 실제 의사결정 시에는 원문과 관련 공시자료를 함께 확인하시기 바랍니다.</p>
        </div>
      </div>

      <RelatedNewsList title="관련 기사" items={related} isLoading={relatedLoading} />
      <RelatedNewsList title="같은 주제 기사" items={sameTopic} isLoading={sameTopicLoading} />
    </div>
  );
}
