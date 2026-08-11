"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { CheckCircle2, LinkIcon, FileText, Sparkles, ExternalLink, RotateCcw, AlertCircle } from "lucide-react";
import { getCategoryGradient } from "@/data/categories";
import { useCategories } from "@/context/categories-context";
import { createInitialPipelineSteps } from "@/lib/api/admin";
import type { PipelineStep, PipelineStepStatus } from "@/lib/schemas/admin.schema";
import type { IngestAnalyzeOutput } from "@/lib/schemas/ingest.schema";
import { ingestInputSchema } from "@/lib/schemas/admin.schema";
import { getCsrfToken } from "@/lib/csrf-client";
import type { News } from "@/lib/schemas/news.schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PipelineStepper } from "@/components/admin/pipeline-stepper";
import { NewsThumbnail } from "@/components/news/news-thumbnail";
import { CategoryBadge } from "@/components/news/category-badge";

type Phase = "input" | "running" | "review" | "done";

interface DraftArticle {
  analysis: IngestAnalyzeOutput;
  body: string;
  sourceUrl: string | null;
  modelKey: string;
  tokenInput: number;
  tokenOutput: number;
  latencyMs: number;
}

export default function AdminNewsIngestPage() {
  const categories = useCategories();
  const [mode, setMode] = React.useState<"url" | "text">("url");
  const [url, setUrl] = React.useState("");
  const [text, setText] = React.useState("");
  const [formError, setFormError] = React.useState<string | null>(null);
  const [phase, setPhase] = React.useState<Phase>("input");
  const [steps, setSteps] = React.useState<PipelineStep[]>(createInitialPipelineSteps());
  const [draft, setDraft] = React.useState<DraftArticle | null>(null);
  const [imageUrl, setImageUrl] = React.useState("");
  const [createdNews, setCreatedNews] = React.useState<News | null>(null);
  const [isPublishing, setIsPublishing] = React.useState(false);

  function updateStep(id: string, status: PipelineStepStatus, detail?: string) {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, status, detail: detail ?? s.detail } : s)));
  }

  async function startAnalysis() {
    const parsed = ingestInputSchema.safeParse({ mode, url: mode === "url" ? url : undefined, text: mode === "text" ? text : undefined });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "입력값을 확인해주세요.");
      return;
    }
    setFormError(null);
    setSteps(createInitialPipelineSteps());
    setPhase("running");
    updateStep("extract", "running");

    try {
      let res: Response;
      try {
        res = await fetch("/api/admin/ingest/analyze", {
          method: "POST",
          headers: { "content-type": "application/json", "x-csrf-token": getCsrfToken() ?? "" },
          body: JSON.stringify({ mode, url: mode === "url" ? url : undefined, text: mode === "text" ? text : undefined }),
        });
      } catch {
        throw new Error("서버에 연결할 수 없습니다. 네트워크 상태를 확인해주세요.");
      }

      let body: {
        error?: string;
        analysis?: unknown;
        body?: string;
        sourceUrl?: string | null;
        extractedImageUrl?: string | null;
        modelKey?: string;
        tokenInput?: number;
        tokenOutput?: number;
        latencyMs?: number;
      };
      try {
        body = await res.json();
      } catch {
        // A timed-out or crashed serverless function returns an HTML/plain-text
        // error page, not JSON — surface the HTTP status so it's diagnosable
        // instead of collapsing into a generic "network error".
        throw new Error(
          res.status === 504
            ? "AI 분석이 시간 초과되었습니다 (504). 본문이 너무 길거나 응답이 지연되었습니다."
            : `서버 응답을 처리하지 못했습니다 (HTTP ${res.status}).`
        );
      }

      if (!res.ok) {
        throw new Error(body.error ?? `분석에 실패했습니다 (HTTP ${res.status}).`);
      }

      updateStep("extract", "done", `본문 ${body.body!.length}자 추출 및 AI 분석 완료.`);
      updateStep("review", "done", "게시 준비가 완료되었습니다.");
      setDraft({
        analysis: body.analysis as IngestAnalyzeOutput,
        body: body.body!,
        sourceUrl: body.sourceUrl ?? null,
        modelKey: body.modelKey ?? "unknown",
        tokenInput: body.tokenInput ?? 0,
        tokenOutput: body.tokenOutput ?? 0,
        latencyMs: body.latencyMs ?? 0,
      });
      // URL 모드면 페이지의 og:image를 자동으로 채워준다 — 원문 붙여넣기 모드는
      // 스크랩할 페이지가 없어 대표 이미지를 알아낼 방법이 없다. 어느 쪽이든
      // 검토 단계에서 관리자가 직접 수정/삭제할 수 있다.
      setImageUrl(body.extractedImageUrl ?? "");
      setPhase("review");
    } catch (e) {
      const message = e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.";
      updateStep("extract", "error", message);
      toast.error(message);
      setPhase("input");
    }
  }

  async function publish() {
    if (!draft) return;
    setIsPublishing(true);

    try {
      const res = await fetch("/api/v1/admin/articles", {
        method: "POST",
        headers: { "content-type": "application/json", "x-csrf-token": getCsrfToken() ?? "" },
        body: JSON.stringify({
          title: draft.analysis.title,
          categoryId: draft.analysis.categoryId,
          summaryBullets: draft.analysis.summaryBullets,
          keywords: draft.analysis.keywords,
          glossary: draft.analysis.glossary,
          body: draft.body,
          sourceUrl: draft.sourceUrl,
          imageUrl: imageUrl.trim() === "" ? null : imageUrl.trim(),
          modelKey: draft.modelKey,
          tokenInput: draft.tokenInput,
          tokenOutput: draft.tokenOutput,
          latencyMs: draft.latencyMs,
        }),
      });
      const resBody = await res.json().catch(() => null);
      if (!res.ok) {
        const message =
          res.status === 409
            ? "이미 게시된 기사입니다. 동일한 URL 또는 본문이 이미 등록되어 있습니다."
            : (resBody?.error?.message as string | undefined) ?? "기사 저장에 실패했습니다.";
        toast.error(message);
        return;
      }

      const articleId = resBody.data.articleId as string;
      const status = resBody.data.status as "published" | "draft";
      const publishedRes = await fetch(`/api/v1/articles/${articleId}`);
      const publishedBody = await publishedRes.json().catch(() => null);
      setCreatedNews(publishedBody?.success ? publishedBody.data : null);
      setPhase("done");
      toast.success(
        status === "published"
          ? "기사가 게시되어 메인 뉴스 목록에 표시됩니다."
          : "임시저장으로 등록되었습니다. 설정에서 '자동 게시'가 꺼져 있어 검수 후 직접 게시해야 합니다."
      );
    } catch {
      toast.error("서버에 연결할 수 없어 게시하지 못했습니다.");
    } finally {
      setIsPublishing(false);
    }
  }

  function reset() {
    setPhase("input");
    setUrl("");
    setText("");
    setDraft(null);
    setImageUrl("");
    setCreatedNews(null);
    setSteps(createInitialPipelineSteps());
  }

  function updateDraft(patch: Partial<IngestAnalyzeOutput>) {
    setDraft((prev) => (prev ? { ...prev, analysis: { ...prev.analysis, ...patch } } : prev));
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-page-title">기사 등록</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          뉴스 URL 또는 기사 전문을 입력하면 실제 본문을 추출하고 Claude API로 분석해 초안을 만듭니다.
        </p>
      </div>

      {phase === "input" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">자동 등록</CardTitle>
            <CardDescription>URL을 입력하거나 스크랩한 기사 전문을 붙여넣으세요.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={mode} onValueChange={(v) => setMode(v as "url" | "text")}>
              <TabsList>
                <TabsTrigger value="url" className="gap-1.5">
                  <LinkIcon className="h-3.5 w-3.5" /> URL 입력
                </TabsTrigger>
                <TabsTrigger value="text" className="gap-1.5">
                  <FileText className="h-3.5 w-3.5" /> 원문 붙여넣기
                </TabsTrigger>
              </TabsList>
              <TabsContent value="url">
                <Input
                  placeholder="https://example.com/news/article/12345"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </TabsContent>
              <TabsContent value="text">
                <Textarea
                  placeholder="스크랩한 기사 전문을 붙여넣으세요..."
                  rows={8}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
              </TabsContent>
            </Tabs>
            {formError && (
              <p className="flex items-center gap-1.5 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5" /> {formError}
              </p>
            )}
            <Button onClick={startAnalysis} className="w-full sm:w-auto">
              <Sparkles className="h-4 w-4" /> AI 분석 시작
            </Button>
          </CardContent>
        </Card>
      )}

      {phase === "running" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">처리 중</CardTitle>
            <CardDescription>본문을 추출하고 Claude API로 분석하는 중입니다. 몇 초 정도 걸릴 수 있습니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <PipelineStepper steps={steps} />
          </CardContent>
        </Card>
      )}

      {phase === "review" && draft && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">AI 분석 결과 (검토 후 게시)</CardTitle>
              <CardDescription>제목과 카테고리는 게시 전 수정할 수 있습니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="draft-title">제목</Label>
                <Input id="draft-title" value={draft.analysis.title} onChange={(e) => updateDraft({ title: e.target.value })} />
              </div>

              <div className="space-y-1.5">
                <Label>카테고리</Label>
                <Select value={draft.analysis.categoryId} onValueChange={(v) => updateDraft({ categoryId: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>AI 요약 (3줄)</Label>
                <ul className="space-y-1 rounded-lg bg-muted/50 p-3">
                  {draft.analysis.summaryBullets.map((line, i) => (
                    <li key={i} className="text-xs leading-relaxed text-muted-foreground">
                      · {line}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-1.5">
                <Label>핵심 키워드 / 태그</Label>
                <div className="flex flex-wrap gap-1.5">
                  {draft.analysis.keywords.map((k) => (
                    <span key={k} className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                      #{k}
                    </span>
                  ))}
                  {draft.analysis.tags.map((t) => (
                    <span key={t} className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-semibold text-accent">
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>용어 설명 (AI 자동 추출)</Label>
                {draft.analysis.glossary.length > 0 ? (
                  <ul className="space-y-1.5 rounded-lg bg-muted/50 p-3">
                    {draft.analysis.glossary.map((g) => (
                      <li key={g.term} className="text-xs leading-relaxed text-muted-foreground">
                        <span className="font-semibold text-foreground">{g.term}</span> — {g.definition}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    이 기사에서는 별도로 설명이 필요한 전문용어를 찾지 못했습니다.
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="image-url">대표 이미지 URL (선택)</Label>
                <Input
                  id="image-url"
                  placeholder="https://example.com/image.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {draft.sourceUrl && imageUrl
                    ? "원문 페이지에서 자동으로 찾아 채웠습니다. 필요하면 수정하거나 비워두세요."
                    : "비워두면 카테고리 색상의 기본 썸네일이 표시됩니다."}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>본문 미리보기</Label>
                <p className="max-h-40 overflow-y-auto whitespace-pre-line rounded-lg border border-border p-3 text-xs leading-relaxed text-muted-foreground">
                  {draft.body}
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={reset}>
                  취소
                </Button>
                <Button onClick={publish} disabled={isPublishing}>
                  {isPublishing ? "게시 중..." : "게시"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-base">미리보기</CardTitle>
              <CardDescription>실제 게시될 카드 모습입니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <NewsThumbnail
                categoryId={draft.analysis.categoryId}
                gradient={getCategoryGradient(draft.analysis.categoryId)}
                imageUrl={imageUrl}
                className="aspect-[16/9] w-full"
              />
              <h3 className="text-base font-bold leading-snug">{draft.analysis.title}</h3>
              <CategoryBadge categoryId={draft.analysis.categoryId} />
              <p className="text-xs text-muted-foreground">
                {draft.sourceUrl ? "외부 링크" : "직접 등록"} · {categories.find((c) => c.id === draft.analysis.categoryId)?.name}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {phase === "done" && createdNews && (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 rounded-lg bg-success/10 p-3 text-sm font-semibold text-success"
            >
              <CheckCircle2 className="h-4 w-4" />
              {createdNews.status === "published" ? "메인 뉴스에 게시되었습니다." : "임시저장으로 등록되었습니다. 뉴스 관리에서 검수 후 게시해주세요."}
            </motion.div>
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href={`/news/${createdNews.id}`} target="_blank">
                  <ExternalLink className="h-4 w-4" /> {createdNews.status === "published" ? "게시된 기사 보기" : "미리보기"}
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/admin/news">뉴스 관리로 이동</Link>
              </Button>
              <Button variant="ghost" onClick={reset}>
                <RotateCcw className="h-4 w-4" /> 새 기사 등록
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
