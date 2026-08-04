"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, Eye, Info, Sparkles } from "lucide-react";
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
    incrementView(id);
    addRecentlyViewed(id);
  }, [id, addRecentlyViewed]);

  if (isLoading) {
    return (
      <div className="container max-w-3xl space-y-4 py-8">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="aspect-[2/1] w-full rounded-2xl" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (!news) {
    return (
      <div className="container max-w-3xl py-20 text-center">
        <p className="text-lg font-semibold">기사를 찾을 수 없습니다.</p>
        <Link href="/news" className="mt-3 inline-block text-sm font-semibold text-primary">
          전체 뉴스로 돌아가기
        </Link>
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

        <h1 className="mt-3 text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">{news.title}</h1>

        <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{media?.name}</span>
          <span>·</span>
          <span>{news.reporter}</span>
          <span>·</span>
          <span>{relativeTime(news.publishedAt)}</span>
          <span>·</span>
          <span className="flex items-center gap-0.5">
            <Eye className="h-3.5 w-3.5" /> 조회 {formatCount(news.viewCount)}
          </span>
        </div>

        <div className="mt-4 flex items-center gap-4 border-y border-border py-3">
          <LikeButton newsId={news.id} likeCount={news.likeCount} size="md" />
          <BookmarkButton newsId={news.id} size="md" />
          <ShareButton title={news.title} path={`/news/${news.id}`} size="md" />
        </div>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="mb-3 flex items-center gap-2">
          <Badge variant="accent" className="gap-1">
            <Sparkles className="h-3 w-3" /> AI 3줄 요약
          </Badge>
          <AiImportance score={news.aiImportance} />
        </div>
        <ul className="space-y-1.5">
          {news.summaryBullets.map((line, i) => (
            <li key={i} className="text-sm leading-relaxed text-foreground">
              · {annotate(line)}
            </li>
          ))}
        </ul>

        <button
          onClick={() => setAnalysisOpen((v) => !v)}
          className="mt-4 flex items-center gap-1 text-sm font-semibold text-primary"
          aria-expanded={analysisOpen}
        >
          {analysisOpen ? "AI 상세분석 접기" : "AI 상세분석 더보기"}
          <ChevronDown className={cn("h-4 w-4 transition-transform duration-300", analysisOpen && "rotate-180")} />
        </button>

        <div
          className={cn(
            "grid overflow-hidden transition-[grid-template-rows] duration-300 ease-in-out",
            analysisOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          )}
        >
          <div className="min-h-0">
            <div className="mt-4 space-y-3 border-t border-border pt-4">
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
            className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
          >
            #{kw}
          </Link>
        ))}
      </div>

      <div className="flex gap-2.5 rounded-xl bg-muted p-4 text-xs leading-relaxed text-muted-foreground">
        <Info className="h-4 w-4 shrink-0" />
        <p>본 분석은 AI가 기사 본문을 해석해 생성한 참고 자료이며, 실제 의사결정 시에는 원문과 관련 공시자료를 함께 확인하시기 바랍니다.</p>
      </div>

      <RelatedNewsList title="관련 기사" items={related} isLoading={relatedLoading} />
      <RelatedNewsList title="같은 주제 기사" items={sameTopic} isLoading={sameTopicLoading} />
    </div>
  );
}
