"use client";

import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserActivity } from "@/context/user-activity-context";
import { useLikeMutation } from "@/lib/query/use-news";

interface LikeButtonProps {
  newsId: string;
  likeCount: number;
  size?: "sm" | "md";
}

export function LikeButton({ newsId, likeCount, size = "sm" }: LikeButtonProps) {
  const { isLiked, toggleLike } = useUserActivity();
  const liked = isLiked(newsId);
  const mutation = useLikeMutation(newsId, likeCount);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const next = !liked;
    toggleLike(newsId);
    mutation.mutate(next);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={liked}
      aria-label="좋아요"
      className={cn(
        "inline-flex items-center gap-1 rounded-full transition-colors",
        liked ? "text-destructive" : "text-muted-foreground hover:text-destructive",
        size === "sm" ? "text-xs" : "text-sm"
      )}
    >
      <Heart className={cn(size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4", liked && "fill-current")} />
      <span className="tabular-nums">{likeCount.toLocaleString("ko-KR")}</span>
    </button>
  );
}
