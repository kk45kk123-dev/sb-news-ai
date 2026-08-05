"use client";

import * as React from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

export default function AdminSettingsPage() {
  const [siteName, setSiteName] = React.useState("SB NEWS AI");
  const [autoPublish, setAutoPublish] = React.useState(true);
  const [duplicateCheck, setDuplicateCheck] = React.useState(true);
  const [emailAlerts, setEmailAlerts] = React.useState(false);
  const [scrapAlerts, setScrapAlerts] = React.useState(true);

  function save() {
    toast.success("설정이 저장되었습니다.");
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
          <Input id="siteName" value={siteName} onChange={(e) => setSiteName(e.target.value)} className="max-w-xs" />
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
              <p className="text-xs text-muted-foreground">끄면 게시 전 관리자 검수 단계를 거칩니다.</p>
            </div>
            <Switch checked={autoPublish} onCheckedChange={setAutoPublish} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">중복 기사 자동 검사</p>
              <p className="text-xs text-muted-foreground">등록 전 유사 기사를 자동으로 탐지합니다.</p>
            </div>
            <Switch checked={duplicateCheck} onCheckedChange={setDuplicateCheck} />
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
            <Switch checked={emailAlerts} onCheckedChange={setEmailAlerts} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">스크랩 실패 알림</p>
              <p className="text-xs text-muted-foreground">기사 추출 실패 시 즉시 알려드립니다.</p>
            </div>
            <Switch checked={scrapAlerts} onCheckedChange={setScrapAlerts} />
          </div>
        </CardContent>
      </Card>

      <Button onClick={save}>변경사항 저장</Button>
    </div>
  );
}
