"use client";

import * as React from "react";
import { toast } from "sonner";
import { Pencil, Trash2, Plus } from "lucide-react";
import {
  useAdminEconomicEventsQuery,
  useCreateEconomicEventMutation,
  useUpdateEconomicEventMutation,
  useDeleteEconomicEventMutation,
} from "@/lib/query/use-economic-event";
import type { AdminEconomicEvent, EventImportanceValue } from "@/lib/schemas/economic-event.schema";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const IMPORTANCE_LABEL: Record<EventImportanceValue, { label: string; variant: "destructive" | "warning" | "muted" }> = {
  high: { label: "중요", variant: "destructive" },
  medium: { label: "보통", variant: "warning" },
  low: { label: "참고", variant: "muted" },
};

interface FormState {
  title: string;
  eventDate: string;
  eventTime: string;
  importance: EventImportanceValue;
}

const EMPTY_FORM: FormState = { title: "", eventDate: "", eventTime: "", importance: "medium" };

export default function AdminEconomicEventsPage() {
  const { data: events, isLoading } = useAdminEconomicEventsQuery();
  const createMutation = useCreateEconomicEventMutation();
  const updateMutation = useUpdateEconomicEventMutation();
  const deleteMutation = useDeleteEconomicEventMutation();

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<AdminEconomicEvent | null>(null);
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = React.useState<{ id: string; title: string } | null>(null);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(event: AdminEconomicEvent) {
    setEditing(event);
    setForm({
      title: event.title,
      eventDate: event.eventDate,
      eventTime: event.eventTime ?? "",
      importance: event.importance,
    });
    setDialogOpen(true);
  }

  function save() {
    if (!form.title.trim() || !form.eventDate) {
      toast.error("제목과 날짜를 입력해주세요.");
      return;
    }
    const payload = {
      title: form.title.trim(),
      eventDate: form.eventDate,
      eventTime: form.eventTime.trim() || null,
      importance: form.importance,
    };
    const mutation = editing
      ? updateMutation.mutateAsync({ id: editing.id, patch: payload })
      : createMutation.mutateAsync(payload);
    mutation
      .then(() => {
        toast.success(editing ? "일정을 수정했습니다." : "일정을 등록했습니다.");
        setDialogOpen(false);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "저장에 실패했습니다."));
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => toast.success("일정을 삭제했습니다."),
      onError: (err) => toast.error(err instanceof Error ? err.message : "삭제에 실패했습니다."),
    });
    setDeleteTarget(null);
  }

  const saving = createMutation.isPending || updateMutation.isPending;
  const sorted = events ? [...events].sort((a, b) => a.eventDate.localeCompare(b.eventDate)) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-page-title">경제 일정 관리</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            홈 화면 &ldquo;경제 일정&rdquo; 카드에 노출되는 일정입니다. 2주 이상 갱신하지 않으면 알림으로 알려드립니다.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> 일정 추가
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <p className="p-10 text-center text-sm text-muted-foreground">등록된 일정이 없습니다.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>날짜</TableHead>
                  <TableHead>시각</TableHead>
                  <TableHead>제목</TableHead>
                  <TableHead>중요도</TableHead>
                  <TableHead className="text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((e) => {
                  const meta = IMPORTANCE_LABEL[e.importance];
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="tabular-nums">{e.eventDate}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{e.eventTime ?? "-"}</TableCell>
                      <TableCell className="text-sm">{e.title}</TableCell>
                      <TableCell>
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(e)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteTarget({ id: e.id, title: e.title })}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "일정 수정" : "일정 추가"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="event-title">제목</Label>
              <Input
                id="event-title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="예: 한국은행 금융통화위원회 통화정책방향 결정회의"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="event-date">날짜</Label>
                <Input
                  id="event-date"
                  type="date"
                  value={form.eventDate}
                  onChange={(e) => setForm((f) => ({ ...f, eventDate: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="event-time">시각 (선택)</Label>
                <Input
                  id="event-time"
                  value={form.eventTime}
                  onChange={(e) => setForm((f) => ({ ...f, eventTime: e.target.value }))}
                  placeholder="예: 09:00"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>중요도</Label>
              <Select
                value={form.importance}
                onValueChange={(v) => setForm((f) => ({ ...f, importance: v as EventImportanceValue }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">중요</SelectItem>
                  <SelectItem value="medium">보통</SelectItem>
                  <SelectItem value="low">참고</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">취소</Button>
            </DialogClose>
            <Button onClick={save} disabled={saving}>
              {saving ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>일정을 삭제할까요?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            &ldquo;{deleteTarget?.title}&rdquo; 일정이 홈 화면에서 사라집니다. 이 작업은 되돌릴 수 없습니다.
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
    </div>
  );
}
