"use client";

import * as React from "react";
import { toast } from "sonner";
import { useSettingsQuery, useUpdateSettingsMutation } from "@/lib/query/use-admin";
import type { OrgSettings } from "@/lib/schemas/settings.schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminSettingsPage() {
  const { data: settings, isLoading } = useSettingsQuery();
  const updateSettings = useUpdateSettingsMutation();
  const [draft, setDraft] = React.useState<OrgSettings | null>(null);

  React.useEffect(() => {
    if (settings) setDraft(settings);
  }, [settings]);

  function patch(p: Partial<OrgSettings>) {
    setDraft((d) => (d ? { ...d, ...p } : d));
  }

  function save() {
    if (!draft) return;
    updateSettings.mutate(draft, {
      onSuccess: () => toast.success("설정이 저장되었습니다."),
      onError: (err) => toast.error(err instanceof Error ? err.message : "설정 저장에 실패했습니다."),
    });
  }

  if (isLoading || !draft) {
    return (
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-page-title">설정</h1>
          <p className="mt-1 text-sm text-muted-foreground">서비스 운영 및 파이프라인 관련 설정을 관리합니다.</p>
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-page-title">설정</h1>
        <p className="mt-1 text-sm text-muted-foreground">서비스 운영 및 파이프라인 관련 설정을 관리합니다.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">일반</CardTitle>
          <CardDescription>서비스 기본 정보입니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1.5">
          <Label htmlFor="siteName">서비스 이름</Label>
          <Input id="siteName" value={draft.siteName} onChange={(e) => patch({ siteName: e.target.value })} className="max-w-xs" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">뉴스 수집 파이프라인</CardTitle>
          <CardDescription>기사 등록 자동화 파이프라인의 동작 방식을 설정합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">파이프라인 완료 후 자동 게시</p>
              <p className="text-xs text-muted-foreground">끄면 게시 전 관리자 검수 단계(임시저장)를 거칩니다.</p>
            </div>
            <Switch checked={draft.autoPublish} onCheckedChange={(v) => patch({ autoPublish: v })} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">중복 기사 자동 검사</p>
              <p className="text-xs text-muted-foreground">24시간 내 동일 제목의 기사가 이미 수집되어 있으면 건너뜁니다.</p>
            </div>
            <Switch checked={draft.duplicateCheck} onCheckedChange={(v) => patch({ duplicateCheck: v })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">알림</CardTitle>
          <CardDescription>관리자 알림 수신 방식을 설정합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">이메일 알림</p>
              <p className="text-xs text-muted-foreground">주요 이벤트 발생 시 이메일로 알려드립니다.</p>
            </div>
            <Switch checked={draft.emailAlerts} onCheckedChange={(v) => patch({ emailAlerts: v })} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">스크랩 실패 알림</p>
              <p className="text-xs text-muted-foreground">기사 추출 실패 시 즉시 알려드립니다.</p>
            </div>
            <Switch checked={draft.scrapAlerts} onCheckedChange={(v) => patch({ scrapAlerts: v })} />
          </div>
          <p className="text-xs text-muted-foreground">
            ※ 이메일 발송은 아직 연결되어 있지 않아, 두 알림 모두 지금은 화면 상단의 알림함(🔔)으로 전달됩니다.
          </p>
        </CardContent>
      </Card>

      <Button onClick={save} disabled={updateSettings.isPending}>
        {updateSettings.isPending ? "저장 중..." : "변경사항 저장"}
      </Button>
    </div>
  );
}
