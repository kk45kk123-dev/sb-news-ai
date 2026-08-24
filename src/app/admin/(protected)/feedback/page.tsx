"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { relativeTime } from "@/lib/format";
import { useAdminFeedbackQuery, useUpdateFeedbackStatusMutation } from "@/lib/query/use-admin";
import type { FeedbackStatusValue } from "@/lib/schemas/feedback.schema";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STATUS_FILTERS: { value: FeedbackStatusValue | "all"; label: string }[] = [
  { value: "open", label: "대기중" },
  { value: "reviewed", label: "확인함" },
  { value: "resolved", label: "처리완료" },
  { value: "all", label: "전체" },
];

const STATUS_BADGE: Record<FeedbackStatusValue, { label: string; variant: "warning" | "accent" | "success" }> = {
  open: { label: "대기중", variant: "warning" },
  reviewed: { label: "확인함", variant: "accent" },
  resolved: { label: "처리완료", variant: "success" },
};

/** F-12 축소판 — 3단계(open→reviewed→resolved)를 다 쓰지 않고, "확인함" 버튼 하나로
 *  open→resolved까지 한 번에 처리한다. 검수 이력을 세분화할 필요가 생기면 그때 늘린다. */
export default function AdminFeedbackPage() {
  const [filter, setFilter] = React.useState<FeedbackStatusValue | "all">("open");
  const { data: items, isLoading } = useAdminFeedbackQuery(filter === "all" ? undefined : filter);
  const updateStatus = useUpdateFeedbackStatusMutation();
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  function resolve(id: string) {
    setPendingId(id);
    updateStatus.mutate(
      { id, status: "resolved" },
      {
        onSuccess: () => {
          toast.success("처리완료로 표시했습니다.");
          setPendingId(null);
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "처리에 실패했습니다.");
          setPendingId(null);
        },
      }
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-page-title">품질 피드백</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          독자가 남긴 AI 분석 👍/👎 피드백입니다. {items ? `(${items.length}건)` : ""}
        </p>
      </div>

      <div className="flex gap-1.5">
        {STATUS_FILTERS.map((f) => (
          <Button
            key={f.value}
            variant={filter === f.value ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !items || items.length === 0 ? (
            <p className="p-10 text-center text-sm text-muted-foreground">해당하는 피드백이 없습니다.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>기사</TableHead>
                  <TableHead>종류</TableHead>
                  <TableHead>사유</TableHead>
                  <TableHead>작성자</TableHead>
                  <TableHead>시각</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="max-w-64">
                      <Link href={`/news/${f.articleId}`} target="_blank" className="line-clamp-2 text-sm font-medium hover:underline">
                        {f.articleTitle}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {f.type === "good" ? (
                        <ThumbsUp className="h-4 w-4 text-primary" />
                      ) : (
                        <ThumbsDown className={cn("h-4 w-4", f.type === "inaccurate" && "text-destructive")} />
                      )}
                    </TableCell>
                    <TableCell className="max-w-72 text-sm text-muted-foreground">{f.comment || "-"}</TableCell>
                    <TableCell className="text-sm">{f.userName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{relativeTime(f.createdAt)}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGE[f.status].variant}>{STATUS_BADGE[f.status].label}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {f.status !== "resolved" && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={pendingId === f.id && updateStatus.isPending}
                          onClick={() => resolve(f.id)}
                        >
                          확인함
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
