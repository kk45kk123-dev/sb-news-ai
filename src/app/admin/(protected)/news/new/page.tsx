"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { CheckCircle2, LinkIcon, FileText, Sparkles, ExternalLink, RotateCcw } from "lucide-react";
import { getCategoryById } from "@/data/categories";
import { getMediaById } from "@/data/media";
import { PIPELINE_STEP_DEFS, createInitialPipelineSteps, pickNextIncomingArticle } from "@/lib/api/admin";
import type { IncomingArticle } from "@/data/incoming-pool";
import { ingestInputSchema } from "@/lib/schemas/admin.schema";
import type { PipelineStep, PipelineStepStatus } from "@/lib/schemas/admin.schema";
import { useCommitIngestMutation } from "@/lib/query/use-admin";
import type { News } from "@/lib/schemas/news.schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PipelineStepper } from "@/components/admin/pipeline-stepper";
import { NewsThumbnail } from "@/components/news/news-thumbnail";
import { CategoryBadge } from "@/components/news/category-badge";
import { AiImportance } from "@/components/news/ai-importance";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stepDetail(stepId: string, article: IncomingArticle, sourceLabel: string): string {
  const category = getCategoryById(article.categoryId);
  const media = getMediaById(article.mediaId);
  switch (stepId) {
    case "extract":
      return `${sourceLabel}에서 본문을 추출했습니다.`;
    case "parse":
      return `본문 ${article.body.length}자 분석 완료.`;
    case "dedupe":
      return "유사 기사가 발견되지 않았습니다.";
    case "summarize":
      return "AI 3줄 요약을 생성했습니다.";
    case "keywords":
      return `핵심 키워드 ${article.keywords.length}개를 추출했습니다.`;
    case "categorize":
      return `"${category?.name}" 카테고리로 분류했습니다.`;
    case "tag":
      return `태그 ${article.tags.length}개를 생성했습니다.`;
    case "thumbnail":
      return "대표 이미지를 설정했습니다.";
    case "media":
      return `언론사 정보(${media?.name})를 등록했습니다.`;
    case "publish":
      return "게시글 초안을 생성했습니다.";
    case "expose":
      return "메인 뉴스 피드에 자동 노출되었습니다.";
    default:
      return "";
  }
}

type Phase = "input" | "running" | "done";

export default function AdminNewsIngestPage() {
  const [mode, setMode] = React.useState<"url" | "text">("url");
  const [url, setUrl] = React.useState("");
  const [text, setText] = React.useState("");
  const [formError, setFormError] = React.useState<string | null>(null);
  const [phase, setPhase] = React.useState<Phase>("input");
  const [steps, setSteps] = React.useState<PipelineStep[]>(createInitialPipelineSteps());
  const [article, setArticle] = React.useState<IncomingArticle | null>(null);
  const [createdNews, setCreatedNews] = React.useState<News | null>(null);
  const runIdRef = React.useRef(0);

  const commitMutation = useCommitIngestMutation();

  function updateStep(id: string, status: PipelineStepStatus, detail?: string) {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, status, detail: detail ?? s.detail } : s)));
  }

  async function startPipeline() {
    const parsed = ingestInputSchema.safeParse({ mode, url: mode === "url" ? url : undefined, text: mode === "text" ? text : undefined });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "입력값을 확인해주세요.");
      return;
    }
    setFormError(null);

    const runId = ++runIdRef.current;
    const picked = pickNextIncomingArticle();
    setArticle(picked);
    setSteps(createInitialPipelineSteps());
    setPhase("running");

    const sourceLabel = mode === "url" ? url : "붙여넣은 원문";

    for (const def of PIPELINE_STEP_DEFS) {
      if (runIdRef.current !== runId) return;
      updateStep(def.id, "running");
      await sleep(450 + Math.random() * 350);
      if (runIdRef.current !== runId) return;
      updateStep(def.id, "done", stepDetail(def.id, picked, sourceLabel));
    }

    try {
      const created = await commitMutation.mutateAsync({
        title: picked.title,
        thumbnailGradient: picked.thumbnailGradient,
        mediaId: picked.mediaId,
        reporter: picked.reporter,
        publishedAt: new Date().toISOString(),
        viewCount: 0,
        likeCount: 0,
        categoryId: picked.categoryId,
        tags: picked.tags,
        summaryBullets: picked.summaryBullets,
        body: picked.body,
        keywords: picked.keywords,
        aiImportance: picked.aiImportance,
        financialImpact: picked.financialImpact,
        savingsBankImpact: picked.savingsBankImpact,
        sentiment: picked.sentiment,
        aiConfidence: picked.aiConfidence,
        isAiRecommended: picked.isAiRecommended,
        status: "published",
        scheduledAt: null,
        sourceUrl: mode === "url" ? url : null,
      });
      setCreatedNews(created);
      setPhase("done");
      toast.success("기사가 자동으로 등록되어 메인에 노출되었습니다.");
    } catch {
      toast.error("게시글 생성에 실패했습니다.");
      setPhase("input");
    }
  }

  function reset() {
    setPhase("input");
    setUrl("");
    setText("");
    setArticle(null);
    setCreatedNews(null);
    setSteps(createInitialPipelineSteps());
  }

  const isStepDone = (id: string) => steps.find((s) => s.id === id)?.status === "done";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">기사 등록</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          뉴스 URL 또는 기사 전문을 입력하면 AI가 추출부터 게시까지 11단계를 자동으로 수행합니다.
        </p>
      </div>

      {phase === "input" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">자동 등록</CardTitle>
            <CardDescription>URL을 입력하거나 스크랩한 기사 전문을 붙여넣으세요. 관리자는 이후 단계를 직접 수행할 필요가 없습니다.</CardDescription>
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
            {formError && <p className="text-xs text-destructive">{formError}</p>}
            <Button onClick={startPipeline} className="w-full sm:w-auto">
              <Sparkles className="h-4 w-4" /> 자동 등록 시작
            </Button>
          </CardContent>
        </Card>
      )}

      {(phase === "running" || phase === "done") && article && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">파이프라인 진행 상황</CardTitle>
              <CardDescription>총 11단계를 순서대로 자동 수행합니다.</CardDescription>
            </CardHeader>
            <CardContent>
              <PipelineStepper steps={steps} />
            </CardContent>
          </Card>

          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-base">실시간 미리보기</CardTitle>
              <CardDescription>단계가 완료될 때마다 실제 게시될 기사가 채워집니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <AnimatePresence>
                {isStepDone("thumbnail") && (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                    <NewsThumbnail categoryId={article.categoryId} gradient={article.thumbnailGradient} className="aspect-[16/9] w-full" />
                  </motion.div>
                )}
              </AnimatePresence>

              {isStepDone("extract") && (
                <motion.h3 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-base font-bold leading-snug">
                  {article.title}
                </motion.h3>
              )}

              <div className="flex flex-wrap items-center gap-2">
                {isStepDone("categorize") && (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                    <CategoryBadge categoryId={article.categoryId} />
                  </motion.div>
                )}
                {isStepDone("summarize") && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <AiImportance score={article.aiImportance} />
                  </motion.div>
                )}
              </div>

              {isStepDone("summarize") && (
                <motion.ul initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1">
                  {article.summaryBullets.map((line, i) => (
                    <li key={i} className="text-xs leading-relaxed text-muted-foreground">
                      · {line}
                    </li>
                  ))}
                </motion.ul>
              )}

              {isStepDone("keywords") && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-wrap gap-1.5">
                  {article.keywords.map((k) => (
                    <span key={k} className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                      #{k}
                    </span>
                  ))}
                </motion.div>
              )}

              {isStepDone("media") && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-muted-foreground">
                  {getMediaById(article.mediaId)?.name} · {article.reporter}
                </motion.p>
              )}

              {phase === "done" && createdNews && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 rounded-lg bg-success/10 p-3 text-sm font-semibold text-success"
                >
                  <CheckCircle2 className="h-4 w-4" /> 메인 뉴스에 게시되었습니다.
                </motion.div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {phase === "done" && createdNews && (
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href={`/news/${createdNews.id}`} target="_blank">
              <ExternalLink className="h-4 w-4" /> 게시된 기사 보기
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/news">뉴스 관리로 이동</Link>
          </Button>
          <Button variant="ghost" onClick={reset}>
            <RotateCcw className="h-4 w-4" /> 새 기사 등록
          </Button>
        </div>
      )}
    </div>
  );
}
