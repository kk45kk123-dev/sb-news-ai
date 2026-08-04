"use client";

import { MOCK_USERS } from "@/data/mock-users";
import { relativeTime } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const ROLE_LABEL: Record<string, string> = { admin: "관리자", editor: "편집자", viewer: "열람자", user: "일반회원" };
const ROLE_VARIANT: Record<string, "default" | "secondary" | "muted" | "outline"> = {
  admin: "default",
  editor: "secondary",
  viewer: "outline",
  user: "muted",
};

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">사용자 관리</h1>
        <p className="mt-1 text-sm text-muted-foreground">서비스 이용자 및 관리 콘솔 계정 목록입니다. (총 {MOCK_USERS.length}명)</p>
      </div>

      <Card>
        <CardContent className="p-0">
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
              {MOCK_USERS.map((u) => (
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
                  <TableCell className="text-sm text-muted-foreground">{u.joinedAt}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{relativeTime(u.lastActiveAt)}</TableCell>
                  <TableCell>
                    <Badge variant={u.status === "active" ? "success" : "destructive"}>
                      {u.status === "active" ? "활성" : "정지"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
