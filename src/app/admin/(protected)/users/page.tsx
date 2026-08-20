"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api/http";
import { relativeTime } from "@/lib/format";
import { useUpdateOrgUserMutation, useDeleteOrgUserMutation } from "@/lib/query/use-admin";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

interface OrgUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "viewer";
  joinedAt: string;
  lastActiveAt: string | null;
  status: "active" | "suspended";
}

const ROLE_LABEL: Record<string, string> = { admin: "관리자", viewer: "일반회원" };

export default function AdminUsersPage() {
  const { data: users, isLoading } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => apiFetch<OrgUser[]>("/api/v1/admin/users"),
  });
  const updateUser = useUpdateOrgUserMutation();
  const deleteUser = useDeleteOrgUserMutation();
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<{ id: string; name: string } | null>(null);

  function toggleActive(user: OrgUser) {
    setPendingId(user.id);
    const nextActive = user.status === "suspended";
    updateUser.mutate(
      { id: user.id, patch: { isActive: nextActive } },
      {
        onSuccess: () => {
          toast.success(nextActive ? `${user.name}님을 다시 활성화했습니다.` : `${user.name}님을 정지했습니다.`);
          setPendingId(null);
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "처리에 실패했습니다.");
          setPendingId(null);
        },
      }
    );
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    const { id, name } = deleteTarget;
    setPendingId(id);
    deleteUser.mutate(id, {
      onSuccess: () => {
        toast.success(`${name}님 계정을 삭제했습니다. 더 이상 로그인할 수 없습니다.`);
        setPendingId(null);
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : "삭제에 실패했습니다.");
        setPendingId(null);
      },
    });
    setDeleteTarget(null);
  }

  function changeRole(user: OrgUser, role: "admin" | "viewer") {
    if (role === user.role) return;
    setPendingId(user.id);
    updateUser.mutate(
      { id: user.id, patch: { role } },
      {
        onSuccess: () => {
          toast.success(`${user.name}님의 권한을 "${ROLE_LABEL[role]}"(으)로 변경했습니다.`);
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
        <h1 className="text-page-title">사용자 관리</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          서비스 이용자 및 관리 콘솔 계정 목록입니다. {users ? `(총 ${users.length}명)` : ""}
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !users || users.length === 0 ? (
            <p className="p-10 text-center text-sm text-muted-foreground">등록된 사용자가 없습니다.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>사용자</TableHead>
                  <TableHead>권한</TableHead>
                  <TableHead>가입일</TableHead>
                  <TableHead>최근 활동</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => {
                  const isPending = pendingId === u.id && (updateUser.isPending || deleteUser.isPending);
                  return (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-8 w-8 text-xs">
                            <AvatarFallback>{u.name.slice(0, 1)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-semibold">{u.name}</p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={u.role}
                          onValueChange={(v) => changeRole(u, v as "admin" | "viewer")}
                          disabled={isPending}
                        >
                          <SelectTrigger className="h-8 w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">관리자</SelectItem>
                            <SelectItem value="viewer">일반회원</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(u.joinedAt).toLocaleDateString("ko-KR")}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {u.lastActiveAt ? relativeTime(u.lastActiveAt) : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.status === "active" ? "success" : "destructive"}>
                          {u.status === "active" ? "활성" : "정지"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isPending}
                            onClick={() => toggleActive(u)}
                          >
                            {u.status === "active" ? "정지" : "활성화"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive"
                            disabled={isPending}
                            onClick={() => setDeleteTarget({ id: u.id, name: u.name })}
                            aria-label="사용자 삭제"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>계정을 삭제할까요?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            &ldquo;{deleteTarget?.name}&rdquo; 계정을 삭제합니다. 삭제하면 즉시 로그인이 차단되고 사용자 목록에서도
            사라집니다. 이 작업은 화면에서 되돌릴 수 없습니다.
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
