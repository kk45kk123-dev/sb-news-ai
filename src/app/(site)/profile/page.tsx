"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bookmark, Heart, History, LogOut, Pencil, Check, X } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useUserActivity } from "@/context/user-activity-context";
import { ApiRequestError } from "@/lib/api/http";
import { updateProfileSchema } from "@/lib/schemas/user.schema";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export default function ProfilePage() {
  const { user, logout, updateProfileName } = useAuth();
  const { bookmarkedIds, likedIds, recentlyViewedIds } = useUserActivity();
  const router = useRouter();

  const [isEditingName, setIsEditingName] = React.useState(false);
  const [nameDraft, setNameDraft] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);

  function startEditing() {
    setNameDraft(user!.name);
    setIsEditingName(true);
  }

  async function saveName() {
    const parsed = updateProfileSchema.safeParse({ name: nameDraft.trim() });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "이름을 확인해주세요.");
      return;
    }
    if (parsed.data.name === user!.name) {
      setIsEditingName(false);
      return;
    }
    setIsSaving(true);
    try {
      await updateProfileName(parsed.data.name);
      toast.success("이름이 변경되었습니다.");
      setIsEditingName(false);
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : "이름 변경에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

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
          <div className="w-full">
            {isEditingName ? (
              <div className="flex items-center justify-center gap-1.5">
                <Input
                  autoFocus
                  aria-label="이름"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveName();
                    if (e.key === "Escape") setIsEditingName(false);
                  }}
                  disabled={isSaving}
                  className="h-8 max-w-[160px] text-center"
                />
                <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" disabled={isSaving} onClick={saveName}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0"
                  disabled={isSaving}
                  onClick={() => setIsEditingName(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={startEditing}
                className="group inline-flex items-center gap-1.5 text-lg font-bold hover:text-primary"
              >
                {user.name}
                <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            )}
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
