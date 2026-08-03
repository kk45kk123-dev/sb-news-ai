import type { AiModel, PromptVersion } from "@prisma/client";
import { loadActivePromptVersion, renderTemplate } from "./prompt-loader";
import { listActiveModelsForTask } from "@/server/repositories/ai-model.repository";
import { listActiveCategoryNames } from "@/server/repositories/category.repository";
import { recordAiCallLog } from "@/server/repositories/ai-call-log.repository";
import { callAnthropic } from "./providers/anthropic.provider";
import { extractJson } from "./json-extract";
import { scanForPromptInjection } from "./guardrails";
import { analyzeOutputSchema, analyzeOutputJsonSchema, type AnalyzeOutput } from "./schemas/analyze.schema";

export class AiGatewayError extends Error {}
export class NoActiveModelError extends AiGatewayError {}
export class SchemaValidationFailedError extends AiGatewayError {}

export interface AnalyzeArticleInput {
  articleId: string;
  orgId: string;
  title: string;
  publisher: string | null;
  publishedAt: Date;
  content: string;
}

export interface AnalyzeArticleResult {
  output: AnalyzeOutput;
  promptVersion: PromptVersion;
  model: AiModel;
  tokenInput: number;
  tokenOutput: number;
  latencyMs: number;
}

const MAX_ATTEMPTS = 2; // §F-02: "파싱 실패 시 1회 재시도 후 실패 처리"

/**
 * F-02 뉴스 분석. AI Gateway를 거치는 유일한 경로 — 서비스/파이프라인 코드는
 * @anthropic-ai/sdk를 직접 import하지 않는다 (§5.3, ADR-007).
 */
export async function analyzeArticle(input: AnalyzeArticleInput): Promise<AnalyzeArticleResult> {
  const [promptVersion, models, categories] = await Promise.all([
    loadActivePromptVersion("analyze"),
    listActiveModelsForTask("analyze"),
    listActiveCategoryNames(input.orgId),
  ]);

  if (models.length === 0) {
    throw new NoActiveModelError("No active ai_model configured for task_type=analyze");
  }
  const model = models[0]!; // priority 1순위. 폴백(2순위 이상)은 provider 장애 시 처리 — Phase 2에서 확장

  const injectionScan = scanForPromptInjection(input.content);
  if (injectionScan.suspicious) {
    // 차단하지 않는다 (§20-3) — <article> 구분자가 1차 방어선이다. 로그만 남긴다.
    console.warn(`[ai-gateway] possible prompt injection in article ${input.articleId}`, {
      matched: injectionScan.matchedPatterns,
    });
  }

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

  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const startedAt = Date.now();
    try {
      const result = await callAnthropic({
        modelKey: model.modelKey,
        systemPrompt,
        userPrompt: attempt === 1 ? userPrompt : `${userPrompt}\n\n(이전 응답이 JSON 스키마를 위반했습니다. 반드시 유효한 JSON만 출력하세요.)`,
      });
      const latencyMs = Date.now() - startedAt;

      const parsed = extractJson(result.text);
      const validated = analyzeOutputSchema.safeParse(parsed);

      if (!validated.success) {
        lastError = validated.error;
        await recordAiCallLog({
          taskType: "analyze",
          modelId: model.id,
          promptVersionId: promptVersion.id,
          articleId: input.articleId,
          tokenInput: result.tokenInput,
          tokenOutput: result.tokenOutput,
          latencyMs,
          status: "error",
          error: `schema validation failed (attempt ${attempt}): ${validated.error.message}`,
        });
        continue;
      }

      await recordAiCallLog({
        taskType: "analyze",
        modelId: model.id,
        promptVersionId: promptVersion.id,
        articleId: input.articleId,
        tokenInput: result.tokenInput,
        tokenOutput: result.tokenOutput,
        cost:
          (result.tokenInput / 1000) * Number(model.costPer1kInput) +
          (result.tokenOutput / 1000) * Number(model.costPer1kOutput),
        latencyMs,
        status: "success",
      });

      return {
        output: validated.data,
        promptVersion,
        model,
        tokenInput: result.tokenInput,
        tokenOutput: result.tokenOutput,
        latencyMs,
      };
    } catch (e) {
      lastError = e;
      await recordAiCallLog({
        taskType: "analyze",
        modelId: model.id,
        promptVersionId: promptVersion.id,
        articleId: input.articleId,
        status: "error",
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  throw new SchemaValidationFailedError(
    `analyze failed after ${MAX_ATTEMPTS} attempts: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}
