"use client";

import { useRouter } from "next/navigation";
import { Bookmark, Heart, History, LogOut } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useUserActivity } from "@/context/user-activity-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { bookmarkedIds, likedIds, recentlyViewedIds } = useUserActivity();
  const router = useRouter();

  if (!user) {
    return (
      <div className="container max-w-md space-y-4 py-16 text-center">
        <p className="text-sm text-muted-foreground">로그인이 필요한 페이지입니다.</p>
        <Button onClick={() => router.push("/login")}>로그인하러 가기</Button>
      </div>
    );
  }

  return (
    <div className="container max-w-md space-y-6 py-10">
      <Card>
        <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
          <Avatar className="h-16 w-16 text-xl">
            <AvatarFallback>{user.name.slice(0, 1).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-lg font-bold">{user.name}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="flex flex-col items-center gap-1 py-5">
            <Bookmark className="h-4 w-4 text-secondary" />
            <p className="text-lg font-bold tabular-nums">{bookmarkedIds.length}</p>
            <p className="text-xs text-muted-foreground">북마크</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center gap-1 py-5">
            <Heart className="h-4 w-4 text-destructive" />
            <p className="text-lg font-bold tabular-nums">{likedIds.length}</p>
            <p className="text-xs text-muted-foreground">좋아요</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center gap-1 py-5">
            <History className="h-4 w-4 text-muted-foreground" />
            <p className="text-lg font-bold tabular-nums">{recentlyViewedIds.length}</p>
            <p className="text-xs text-muted-foreground">최근 열람</p>
          </CardContent>
        </Card>
      </div>

      <Button variant="outline" className="w-full" onClick={logout}>
        <LogOut className="h-4 w-4" /> 로그아웃
      </Button>
    </div>
  );
}
