import type { AiModel, PromptVersion, AiTaskType } from "@prisma/client";
import { z, type ZodType } from "zod";
import { loadActivePromptVersion, renderTemplate } from "./prompt-loader";
import { listActiveModelsForTask } from "@/server/repositories/ai-model.repository";
import { listActiveCategoryNames } from "@/server/repositories/category.repository";
import { recordAiCallLog } from "@/server/repositories/ai-call-log.repository";
import { callAnthropic } from "./providers/anthropic.provider";
import { embedText } from "./providers/openai.provider";
import { extractJson } from "./json-extract";
import { scanForPromptInjection } from "./guardrails";
import { analyzeOutputSchema, analyzeOutputJsonSchema, type AnalyzeOutput } from "./schemas/analyze.schema";
import { briefingOutputSchema, type BriefingOutput } from "./schemas/briefing.schema";
import { qaOutputSchema, type QaOutput } from "./schemas/qa.schema";

export class AiGatewayError extends Error {}
export class NoActiveModelError extends AiGatewayError {}
export class SchemaValidationFailedError extends AiGatewayError {}

const MAX_ATTEMPTS = 2; // §F-02: "파싱 실패 시 1회 재시도 후 실패 처리" — 다른 task type도 동일 원칙 적용

interface StructuredTaskResult<T> {
  output: T;
  promptVersion: PromptVersion;
  model: AiModel;
  tokenInput: number;
  tokenOutput: number;
  latencyMs: number;
}

/**
 * AI Gateway의 공통 실행부: 활성 프롬프트/모델 로드 → 호출 → JSON 추출/검증 → 실패 시
 * 1회 재시도 → ai_call_logs 기록. analyze/briefing 등 모든 구조화 출력 task가 이걸 공유한다
 * (ADR-007 — LLM 호출은 이 파일 하나만 거친다).
 */
async function callStructuredTask<T>(params: {
  taskType: AiTaskType;
  promptVersion: PromptVersion;
  schema: ZodType<T, z.ZodTypeDef, unknown>;
  systemPrompt: string;
  userPrompt: string;
  articleId?: string;
}): Promise<StructuredTaskResult<T>> {
  const { promptVersion } = params;
  const models = await listActiveModelsForTask(params.taskType);

  if (models.length === 0) {
    throw new NoActiveModelError(`No active ai_model configured for task_type=${params.taskType}`);
  }
  const model = models[0]!; // priority 1순위. 폴백(2순위 이상)은 provider 장애 시 처리 — Phase 2에서 확장

  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const startedAt = Date.now();
    try {
      const result = await callAnthropic({
        modelKey: model.modelKey,
        systemPrompt: params.systemPrompt,
        userPrompt:
          attempt === 1
            ? params.userPrompt
            : `${params.userPrompt}\n\n(이전 응답이 JSON 스키마를 위반했습니다. 반드시 유효한 JSON만 출력하세요.)`,
      });
      const latencyMs = Date.now() - startedAt;

      const parsed = extractJson(result.text);
      const validated = params.schema.safeParse(parsed);

      if (!validated.success) {
        lastError = validated.error;
        await recordAiCallLog({
          taskType: params.taskType,
          modelId: model.id,
          promptVersionId: promptVersion.id,
          articleId: params.articleId,
          tokenInput: result.tokenInput,
          tokenOutput: result.tokenOutput,
          latencyMs,
          status: "error",
          error: `schema validation failed (attempt ${attempt}): ${validated.error.message}`,
        });
        continue;
      }

      await recordAiCallLog({
        taskType: params.taskType,
        modelId: model.id,
        promptVersionId: promptVersion.id,
        articleId: params.articleId,
        tokenInput: result.tokenInput,
        tokenOutput: result.tokenOutput,
        cost:
          (result.tokenInput / 1000) * Number(model.costPer1kInput) +
          (result.tokenOutput / 1000) * Number(model.costPer1kOutput),
        latencyMs,
        status: "success",
      });

      return { output: validated.data, promptVersion, model, tokenInput: result.tokenInput, tokenOutput: result.tokenOutput, latencyMs };
    } catch (e) {
      lastError = e;
      await recordAiCallLog({
        taskType: params.taskType,
        modelId: model.id,
        promptVersionId: promptVersion.id,
        articleId: params.articleId,
        status: "error",
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  throw new SchemaValidationFailedError(
    `${params.taskType} failed after ${MAX_ATTEMPTS} attempts: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}

export interface AnalyzeArticleInput {
  articleId: string;
  orgId: string;
  title: string;
  publisher: string | null;
  publishedAt: Date;
  content: string;
}

/**
 * F-02 뉴스 분석. AI Gateway를 거치는 유일한 경로 — 서비스/파이프라인 코드는
 * @anthropic-ai/sdk를 직접 import하지 않는다 (§5.3, ADR-007).
 */
export async function analyzeArticle(
  input: AnalyzeArticleInput
): Promise<StructuredTaskResult<AnalyzeOutput>> {
  const categories = await listActiveCategoryNames(input.orgId);

  const injectionScan = scanForPromptInjection(input.content);
  if (injectionScan.suspicious) {
    // 차단하지 않는다 (§20-3) — <article> 구분자가 1차 방어선이다. 로그만 남긴다.
    console.warn(`[ai-gateway] possible prompt injection in article ${input.articleId}`, {
      matched: injectionScan.matchedPatterns,
    });
  }

  // 프롬프트 로딩 전에 카테고리가 필요하므로, callStructuredTask 호출 전에 프롬프트를 먼저 읽는다.
  const promptVersion = await loadActivePromptVersion("analyze");
  const systemPrompt = renderTemplate(promptVersion.systemPrompt, {
    schema: JSON.stringify(analyzeOutputJsonSchema, null, 2),
    categories: categories.join(", "),
  });
  const userPrompt = renderTemplate(promptVersion.userTemplate, {
    title: input.title,
    publisher: input.publisher ?? "알 수 없음",
    published_at: input.publishedAt.toISOString(),
    content: input.content,
  });

  return callStructuredTask({
    taskType: "analyze",
    promptVersion,
    schema: analyzeOutputSchema,
    systemPrompt,
    userPrompt,
    articleId: input.articleId,
  });
}

export interface BriefingCandidate {
  id: string;
  title: string;
  summaryLines: string[];
  sbImpactScore: number;
}

/** F-03 오늘의 브리핑. 후보 목록(§F-03: sb_impact_score 우선 정렬된 최대 20건)을 받아 TOP5를 뽑는다. */
export async function generateBriefing(
  candidates: BriefingCandidate[]
): Promise<StructuredTaskResult<BriefingOutput>> {
  const promptVersion = await loadActivePromptVersion("briefing");
  const systemPrompt = promptVersion.systemPrompt;
  const candidatesText = candidates
    .map((c) => `- id: ${c.id}\n  제목: ${c.title}\n  영향도: ${c.sbImpactScore}/5\n  요약: ${c.summaryLines.join(" ")}`)
    .join("\n");
  const userPrompt = renderTemplate(promptVersion.userTemplate, { candidates: candidatesText });

  return callStructuredTask({
    taskType: "briefing",
    promptVersion,
    schema: briefingOutputSchema,
    systemPrompt,
    userPrompt,
  });
}

/**
 * F-07 임베딩 생성. callStructuredTask와 별도 경로다 — JSON 프롬프트/스키마 검증이 아니라
 * 벡터 하나를 그대로 받는 호출이라 공유 헬퍼가 맞지 않는다. ai_call_logs 기록은 동일하게 한다.
 */
export async function embedChunk(text: string): Promise<{ embedding: number[]; model: AiModel }> {
  const models = await listActiveModelsForTask("embed");
  if (models.length === 0) {
    throw new NoActiveModelError("No active ai_model configured for task_type=embed");
  }
  const model = models[0]!;
  const startedAt = Date.now();

  try {
    const result = await embedText(text, model.modelKey);
    await recordAiCallLog({
      taskType: "embed",
      modelId: model.id,
      tokenInput: result.tokenInput,
      cost: (result.tokenInput / 1000) * Number(model.costPer1kInput),
      latencyMs: Date.now() - startedAt,
      status: "success",
    });
    return { embedding: result.embedding, model };
  } catch (e) {
    await recordAiCallLog({
      taskType: "embed",
      modelId: model.id,
      latencyMs: Date.now() - startedAt,
      status: "error",
      error: e instanceof Error ? e.message : String(e),
    });
    throw e;
  }
}

export interface QaDocument {
  index: number;
  articleId: string;
  title: string;
  publisher: string | null;
  publishedAt: Date;
  chunkText: string;
}

/** F-07 AI 질의응답. 검색(§F-07 하이브리드 검색)은 호출부(qa.service.ts) 책임 — 여기는
 *  이미 뽑힌 후보 문서를 받아 인용이 강제된 답변을 생성하는 부분만 담당한다. */
export async function answerQuestion(
  question: string,
  documents: QaDocument[]
): Promise<StructuredTaskResult<QaOutput>> {
  const promptVersion = await loadActivePromptVersion("qa");
  const documentsText = documents
    .map(
      (d) =>
        `[${d.index}] ${d.title} (${d.publisher ?? "출처 미상"}, ${d.publishedAt.toISOString().slice(0, 10)})\n${d.chunkText}`
    )
    .join("\n\n");
  const userPrompt = renderTemplate(promptVersion.userTemplate, {
    documents: documentsText,
    user_question: question,
  });

  return callStructuredTask({
    taskType: "qa",
    promptVersion,
    schema: qaOutputSchema,
    systemPrompt: promptVersion.systemPrompt,
    userPrompt,
  });
}
