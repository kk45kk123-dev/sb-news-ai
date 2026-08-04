"use client";

import { Bookmark } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useUserActivity } from "@/context/user-activity-context";

interface BookmarkButtonProps {
  newsId: string;
  size?: "sm" | "md";
}

export function BookmarkButton({ newsId, size = "sm" }: BookmarkButtonProps) {
  const { isBookmarked, toggleBookmark } = useUserActivity();
  const bookmarked = isBookmarked(newsId);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    toggleBookmark(newsId);
    toast.success(bookmarked ? "북마크에서 제거했습니다." : "북마크에 저장했습니다.");
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={bookmarked}
      aria-label="북마크"
      className={cn(
        "inline-flex items-center justify-center rounded-full transition-colors",
        bookmarked ? "text-secondary" : "text-muted-foreground hover:text-secondary"
      )}
    >
      <Bookmark className={cn(size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4", bookmarked && "fill-current")} />
    </button>
  );
}
