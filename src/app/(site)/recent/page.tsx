"use client";

import { History } from "lucide-react";
import { useUserActivity } from "@/context/user-activity-context";
import { useNewsByIdsQuery } from "@/lib/query/use-news";
import { NewsGrid } from "@/components/news/news-grid";

export default function RecentPage() {
  const { recentlyViewedIds } = useUserActivity();
  const { data, isLoading } = useNewsByIdsQuery(recentlyViewedIds);

  return (
    <div className="container space-y-6 py-8">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
          <History className="h-6 w-6 text-muted-foreground" /> 최근 본 기사
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">최근에 열람한 뉴스 순서대로 표시됩니다.</p>
      </div>
      <NewsGrid
        items={recentlyViewedIds.length ? data : []}
        isLoading={recentlyViewedIds.length > 0 && isLoading}
        emptyMessage="아직 열람한 뉴스가 없습니다."
      />
    </div>
  );
}
