"use client";

import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ShareButtonProps {
  title: string;
  path: string;
  size?: "sm" | "md";
}

export function ShareButton({ title, path, size = "sm" }: ShareButtonProps) {
  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}${path}`;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // user cancelled the share sheet — no-op
      }
      return;
    }
    await navigator.clipboard.writeText(url);
    toast.success("링크가 복사되었습니다.");
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="공유"
      className={cn("inline-flex items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground")}
    >
      <Share2 className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
    </button>
  );
}
