"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Pencil, Trash2, Search, CalendarClock, MoreHorizontal } from "lucide-react";
import { useCategories } from "@/context/categories-context";
import { formatCount, relativeTime } from "@/lib/format";
import { useAdminNewsListQuery, useDeleteNewsMutation, useUpdateNewsMutation } from "@/lib/query/use-admin";
import { CategoryBadge } from "@/components/news/category-badge";
import { Pagination } from "@/components/admin/pagination";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { NewsStatus } from "@/lib/schemas/news.schema";

const STATUS_LABEL: Record<NewsStatus, string> = { published: "게시됨", scheduled: "예약됨", draft: "임시저장" };
const STATUS_VARIANT: Record<NewsStatus, "success" | "warning" | "muted"> = {
  published: "success",
  scheduled: "warning",
  draft: "muted",
};

export function AdminNewsListContent() {
  const categories = useCategories();
  const [page, setPage] = React.useState(1);
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState<string>("all");
  const [categoryId, setCategoryId] = React.useState<string>("all");
  const [deleteTarget, setDeleteTarget] = React.useState<{ id: string; title: string } | null>(null);
  const [scheduleTarget, setScheduleTarget] = React.useState<{ id: string; title: string } | null>(null);
  const [scheduleDate, setScheduleDate] = React.useState("");

  const { data, isLoading } = useAdminNewsListQuery({
    page,
    pageSize: 8,
    query: query || undefined,
    categoryId: categoryId === "all" ? undefined : categoryId,
  });

  const deleteMutation = useDeleteNewsMutation();
  const updateMutation = useUpdateNewsMutation();

  const items = (data?.items ?? []).filter((n) => status === "all" || n.status === status);

  function confirmDelete() {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => toast.success(`"${deleteTarget.title}" 기사를 삭제했습니다.`),
      onError: () => toast.error("삭제에 실패했습니다."),
    });
    setDeleteTarget(null);
  }

  function confirmSchedule() {
    if (!scheduleTarget || !scheduleDate) return;
    updateMutation.mutate(
      { id: scheduleTarget.id, patch: { status: "scheduled", scheduledAt: new Date(scheduleDate).toISOString() } },
      {
        onSuccess: () => toast.success(`"${scheduleTarget.title}" 기사를 ${scheduleDate}에 예약 게시하도록 설정했습니다.`),
        onError: () => toast.error("예약 게시 설정에 실패했습니다."),
      }
    );
    setScheduleTarget(null);
    setScheduleDate("");
  }

  function unpublishToDraft(id: string, title: string) {
    updateMutation.mutate(
      { id, patch: { status: "draft", scheduledAt: null } },
      { onSuccess: () => toast.success(`"${title}" 기사를 임시저장으로 전환했습니다.`) }
    );
  }

  function publishNow(id: string, title: string) {
    updateMutation.mutate(
      { id, patch: { status: "published", scheduledAt: null } },
      { onSuccess: () => toast.success(`"${title}" 기사를 즉시 게시했습니다.`) }
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-page-title">뉴스 관리</h1>
          <p className="mt-1 text-sm text-muted-foreground">등록된 전체 기사를 관리합니다. (총 {data?.total ?? 0}건)</p>
        </div>
        <Button asChild>
          <Link href="/admin/news/new">기사 등록</Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-56">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="제목 검색"
            className="pl-9"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 상태</SelectItem>
            <SelectItem value="published">게시됨</SelectItem>
            <SelectItem value="scheduled">예약됨</SelectItem>
            <SelectItem value="draft">임시저장</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryId} onValueChange={(v) => { setCategoryId(v); setPage(1); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="카테고리" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 카테고리</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Search className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">조건에 맞는 기사가 없습니다</p>
                <p className="text-xs text-muted-foreground">검색어나 필터 조건을 변경해 다시 시도해보세요.</p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>제목</TableHead>
                  <TableHead>언론사</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>조회수</TableHead>
                  <TableHead>등록일</TableHead>
                  <TableHead className="text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((n) => {
                  return (
                    <TableRow key={n.id}>
                      <TableCell className="max-w-xs">
                        <div className="mb-1">
                          <CategoryBadge categoryId={n.categoryId} />
                        </div>
                        <Link href={`/news/${n.id}`} target="_blank" className="line-clamp-1 text-sm font-semibold hover:text-primary">
                          {n.title}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{n.publisher}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <Badge variant={STATUS_VARIANT[n.status]}>{STATUS_LABEL[n.status]}</Badge>
                          {n.status === "scheduled" && n.scheduledAt && (
                            <span className="text-[11px] text-muted-foreground">{new Date(n.scheduledAt).toLocaleDateString("ko-KR")}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="tabular-nums text-sm">{formatCount(n.viewCount)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{relativeTime(n.publishedAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button asChild variant="ghost" size="icon">
                            <Link href={`/admin/news/${n.id}/edit`}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {n.status !== "published" && (
                                <DropdownMenuItem onClick={() => publishNow(n.id, n.title)}>즉시 게시</DropdownMenuItem>
                              )}
                              {n.status !== "draft" && (
                                <DropdownMenuItem onClick={() => unpublishToDraft(n.id, n.title)}>임시저장으로 전환</DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => {
                                  setScheduleTarget({ id: n.id, title: n.title });
                                  setScheduleDate(n.scheduledAt ? n.scheduledAt.slice(0, 10) : "");
                                }}
                              >
                                <CalendarClock className="h-3.5 w-3.5" /> 예약 게시 설정
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeleteTarget({ id: n.id, title: n.title })}
                              >
                                <Trash2 className="h-3.5 w-3.5" /> 삭제
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {data && <Pagination page={page} pageSize={8} total={data.total} onPageChange={setPage} />}

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>기사를 삭제할까요?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            &ldquo;{deleteTarget?.title}&rdquo; 기사가 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">취소</Button>
            </DialogClose>
            <Button variant="destructive" onClick={confirmDelete}>
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!scheduleTarget} onOpenChange={(open) => !open && setScheduleTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>예약 게시 설정</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">&ldquo;{scheduleTarget?.title}&rdquo;을 게시할 날짜를 선택하세요.</p>
          <div className="space-y-1.5">
            <Label htmlFor="scheduleDate">게시 예정일</Label>
            <Input id="scheduleDate" type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">취소</Button>
            </DialogClose>
            <Button onClick={confirmSchedule} disabled={!scheduleDate}>
              예약 설정
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
