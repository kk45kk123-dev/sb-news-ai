"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useMyNotificationsQuery, useMarkAllMyNotificationsReadMutation } from "@/lib/query/use-notifications";
import { relativeTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** F-08 축소판(키워드 워치 인앱 알림)의 표시부 — src/components/admin/notification-bell.tsx와
 *  같은 notifications 테이블을 쓰지만 관리자 전용이 아닌 일반 이용자용이다. */
export function NotificationBell() {
  const { user } = useAuth();
  const { data } = useMyNotificationsQuery(!!user);
  const markAllRead = useMarkAllMyNotificationsReadMutation();

  if (!user) return null;

  const items = data?.items ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full" aria-label="알림">
          <Bell className="h-[18px] w-[18px]" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 h-4 min-w-4 justify-center rounded-full px-1 text-[10px] leading-none"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0">알림</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              모두 읽음
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">새 알림이 없습니다.</p>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {items.map((n) => {
              const content = (
                <div className="flex flex-col gap-0.5 py-1">
                  <div className="flex items-center gap-1.5">
                    {!n.isRead && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                    <p className="text-sm font-medium leading-snug">{n.title}</p>
                  </div>
                  {n.body && <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>}
                  <p className="text-[11px] text-muted-foreground">{relativeTime(n.createdAt)}</p>
                </div>
              );
              return (
                <DropdownMenuItem key={n.id} asChild className="items-start">
                  {n.link ? <Link href={n.link}>{content}</Link> : <div>{content}</div>}
                </DropdownMenuItem>
              );
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
