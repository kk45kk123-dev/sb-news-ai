"use client";

import * as React from "react";
import { toast } from "sonner";
import { NotebookPen } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useMemoQuery, useUpdateMemoMutation } from "@/lib/query/use-news";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const MEMO_MAX_LENGTH = 2000;

/** 로그인한 사용자만 볼 수 있는, 기사별 개인 메모. 다른 사용자에게는 노출되지 않는다. */
export function PersonalMemo({ newsId }: { newsId: string }) {
  const { user } = useAuth();
  const { data: savedMemo, isLoading } = useMemoQuery(newsId);
  const updateMemo = useUpdateMemoMutation(newsId);
  const [draft, setDraft] = React.useState("");
  const [dirty, setDirty] = React.useState(false);

  React.useEffect(() => {
    if (savedMemo !== undefined && !dirty) setDraft(savedMemo);
  }, [savedMemo, dirty]);

  if (!user) return null;

  function save() {
    updateMemo.mutate(draft, {
      onSuccess: () => {
        toast.success("메모가 저장되었습니다.");
        setDirty(false);
      },
      onError: (err) => toast.error(err instanceof Error ? err.message : "메모 저장에 실패했습니다."),
    });
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <NotebookPen className="h-4 w-4 text-muted-foreground" /> 개인 메모
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Textarea
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setDirty(true);
          }}
          placeholder="이 기사에 대한 나만의 메모를 남겨보세요. 다른 사람에게는 보이지 않습니다."
          maxLength={MEMO_MAX_LENGTH}
          rows={4}
          disabled={isLoading}
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {draft.length}/{MEMO_MAX_LENGTH}
          </p>
          <Button size="sm" onClick={save} disabled={!dirty || updateMemo.isPending}>
            {updateMemo.isPending ? "저장 중..." : "메모 저장"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
