"use client";

import { Bookmark } from "lucide-react";
import { useUserActivity } from "@/context/user-activity-context";
import { useNewsByIdsQuery } from "@/lib/query/use-news";
import { NewsGrid } from "@/components/news/news-grid";

export default function BookmarksPage() {
  const { bookmarkedIds } = useUserActivity();
  const { data, isLoading } = useNewsByIdsQuery(bookmarkedIds);

  return (
    <div className="container space-y-6 py-8">
      <div>
        <h1 className="flex items-center gap-2 text-page-title">
          <Bookmark className="h-6 w-6 text-secondary" /> 북마크
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">저장한 뉴스를 모아봤습니다.</p>
      </div>
      <NewsGrid
        items={bookmarkedIds.length ? data : []}
        isLoading={bookmarkedIds.length > 0 && isLoading}
        emptyMessage="아직 저장한 뉴스가 없습니다. 마음에 드는 뉴스에서 북마크를 눌러보세요."
        emptyIcon={Bookmark}
      />
    </div>
  );
}
