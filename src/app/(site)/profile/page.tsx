"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bookmark, Heart, History, LogOut, Pencil, Check, X, Bell, Plus } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useUserActivity } from "@/context/user-activity-context";
import { ApiRequestError } from "@/lib/api/http";
import { updateProfileSchema } from "@/lib/schemas/user.schema";
import { createWatchSchema } from "@/lib/schemas/keyword-watch.schema";
import { useMyWatchesQuery, useCreateWatchMutation, useDeleteWatchMutation } from "@/lib/query/use-keyword-watch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ProfilePage() {
  const { user, logout, updateProfileName } = useAuth();
  const { bookmarkedIds, likedIds, recentlyViewedIds } = useUserActivity();
  const router = useRouter();

  const [isEditingName, setIsEditingName] = React.useState(false);
  const [nameDraft, setNameDraft] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);

  const { data: watches } = useMyWatchesQuery(!!user);
  const createWatch = useCreateWatchMutation();
  const deleteWatch = useDeleteWatchMutation();
  const [keywordDraft, setKeywordDraft] = React.useState("");
  const [minImpactDraft, setMinImpactDraft] = React.useState<string>("any");

  function addWatch(e: React.FormEvent) {
    e.preventDefault();
    const parsed = createWatchSchema.safeParse({
      keyword: keywordDraft.trim(),
      minImpact: minImpactDraft === "any" ? null : Number(minImpactDraft),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "키워드를 확인해주세요.");
      return;
    }
    createWatch.mutate(parsed.data, {
      onSuccess: () => {
        toast.success(`"${parsed.data.keyword}" 키워드를 등록했습니다.`);
        setKeywordDraft("");
        setMinImpactDraft("any");
      },
      onError: (err) => toast.error(err instanceof ApiRequestError ? err.message : "등록에 실패했습니다."),
    });
  }

  function removeWatch(id: string, keyword: string) {
    deleteWatch.mutate(id, {
      onSuccess: () => toast.success(`"${keyword}" 키워드를 삭제했습니다.`),
      onError: (err) => toast.error(err instanceof ApiRequestError ? err.message : "삭제에 실패했습니다."),
    });
  }

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

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-1.5 text-sm">
            <Bell className="h-4 w-4" /> 키워드 워치
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            등록한 키워드가 포함된 새 기사가 게시되면 알림으로 알려드립니다.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <form onSubmit={addWatch} className="flex gap-1.5">
            <Input
              value={keywordDraft}
              onChange={(e) => setKeywordDraft(e.target.value)}
              placeholder="예: PF 연체율"
              disabled={createWatch.isPending}
              className="h-9"
            />
            <Select value={minImpactDraft} onValueChange={setMinImpactDraft} disabled={createWatch.isPending}>
              <SelectTrigger className="h-9 w-28 shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">전체 영향도</SelectItem>
                <SelectItem value="3">3점 이상</SelectItem>
                <SelectItem value="4">4점 이상</SelectItem>
                <SelectItem value="5">5점만</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="submit"
              size="icon"
              className="h-9 w-9 shrink-0"
              disabled={createWatch.isPending}
              aria-label="키워드 추가"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </form>

          {watches && watches.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {watches.map((w) => (
                <Badge key={w.id} variant="muted" className="gap-1.5 py-1 pl-2.5 pr-1.5 text-xs">
                  {w.keyword}
                  {w.minImpact && <span className="text-muted-foreground">({w.minImpact}점+)</span>}
                  <button
                    type="button"
                    onClick={() => removeWatch(w.id, w.keyword)}
                    disabled={deleteWatch.isPending}
                    aria-label={`${w.keyword} 워치 삭제`}
                    className="rounded-full p-0.5 hover:bg-foreground/10"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Button variant="outline" className="w-full" onClick={logout}>
        <LogOut className="h-4 w-4" /> 로그아웃
      </Button>
    </div>
  );
}
