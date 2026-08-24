"use client";

import * as React from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { useMyFeedbackQuery, useSubmitFeedbackMutation } from "@/lib/query/use-news";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

interface FeedbackButtonsProps {
  newsId: string;
}

/** F-12 축소판: AI 분석(3줄 요약/영향도 등)에 대한 👍/👎. 같은 버튼을 다시 누르면 취소된다. */
export function FeedbackButtons({ newsId }: FeedbackButtonsProps) {
  const { user } = useAuth();
  const { data } = useMyFeedbackQuery(newsId);
  const mutation = useSubmitFeedbackMutation(newsId);
  const [reportOpen, setReportOpen] = React.useState(false);
  const [comment, setComment] = React.useState("");

  const current = data?.type ?? null;

  function requireLogin(): boolean {
    if (!user) {
      toast.error("로그인이 필요합니다.");
      return false;
    }
    return true;
  }

  function handleGood() {
    if (!requireLogin()) return;
    mutation.mutate(
      { type: "good" },
      { onSuccess: (r) => toast.success(r.type ? "피드백 감사합니다." : "피드백을 취소했습니다.") }
    );
  }

  function handleBadClick() {
    if (!requireLogin()) return;
    if (current === "inaccurate") {
      // 이미 눌러둔 상태에서 다시 누르면 취소 — 코멘트 입력 없이 바로 토글한다.
      mutation.mutate({ type: "inaccurate" }, { onSuccess: () => toast.success("피드백을 취소했습니다.") });
      return;
    }
    setComment("");
    setReportOpen(true);
  }

  function submitReport() {
    mutation.mutate(
      { type: "inaccurate", comment: comment.trim() || undefined },
      { onSuccess: () => toast.success("신고해주셔서 감사합니다. 검토하겠습니다.") }
    );
    setReportOpen(false);
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">이 AI 분석이 도움이 됐나요?</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn("h-8 gap-1.5 px-2.5", current === "good" && "border-primary text-primary")}
          onClick={handleGood}
          disabled={mutation.isPending}
          aria-pressed={current === "good"}
        >
          <ThumbsUp className={cn("h-3.5 w-3.5", current === "good" && "fill-current")} />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn("h-8 gap-1.5 px-2.5", current === "inaccurate" && "border-destructive text-destructive")}
          onClick={handleBadClick}
          disabled={mutation.isPending}
          aria-pressed={current === "inaccurate"}
        >
          <ThumbsDown className={cn("h-3.5 w-3.5", current === "inaccurate" && "fill-current")} />
        </Button>
      </div>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>어떤 부분이 부정확한가요?</DialogTitle>
            <DialogDescription>선택 입력입니다. 남겨주시면 관리자 검토에 도움이 됩니다.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="예: 영향도 점수가 실제보다 과장된 것 같습니다."
            maxLength={500}
            rows={4}
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">취소</Button>
            </DialogClose>
            <Button onClick={submitReport} disabled={mutation.isPending}>
              신고하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
