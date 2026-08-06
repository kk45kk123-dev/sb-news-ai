"use client";

import * as React from "react";
import { apiFetch } from "@/lib/api/http";
import { relativeTime } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

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
const ROLE_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  admin: "default",
  viewer: "outline",
};

export default function AdminUsersPage() {
  const [users, setUsers] = React.useState<OrgUser[] | null>(null);

  React.useEffect(() => {
    apiFetch<OrgUser[]>("/api/v1/admin/users")
      .then(setUsers)
      .catch(() => setUsers([]));
  }, []);

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
          {users === null ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : users.length === 0 ? (
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
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
                      <Badge variant={ROLE_VARIANT[u.role]}>{ROLE_LABEL[u.role]}</Badge>
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
