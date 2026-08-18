"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useTodayBriefingQuery } from "@/lib/query/use-briefing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * AI가 최근 24시간 수집분 중 영향도 높은 기사들을 묶어 "왜 지금 중요한지 / 어떻게
 * 대응할지"로 정리한 요약. 비로그인 방문자(GET이 401)나 아직 생성된 브리핑이 없는
 * 날에는 조용히 숨는다 — run-daily-pipeline.ts의 일일 파이프라인이 생성 트리거다.
 */
export function TodayBriefing() {
  const { data: briefing, isLoading } = useTodayBriefingQuery();

  if (isLoading) {
    return <Skeleton className="h-48 w-full rounded-2xl" />;
  }
  if (!briefing) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" /> 오늘의 브리핑
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <p className="text-sm leading-relaxed text-foreground">{briefing.overview}</p>

        <ul className="space-y-3">
          {briefing.items.map((item) => (
            <li key={item.articleId} className="rounded-lg border border-border p-3">
              {item.title && (
                <Link
                  href={`/news/${item.articleId}`}
                  className="line-clamp-1 text-sm font-semibold text-foreground hover:text-primary"
                >
                  {item.title}
                </Link>
              )}
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground/70">왜 지금: </span>
                {item.whyNow}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground/70">대응 방향: </span>
                {item.soWhat}
              </p>
            </li>
          ))}
        </ul>

        {briefing.followUps.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-semibold text-muted-foreground">후속 이슈</p>
            <ul className="list-inside list-disc space-y-0.5 text-xs text-muted-foreground">
              {briefing.followUps.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
