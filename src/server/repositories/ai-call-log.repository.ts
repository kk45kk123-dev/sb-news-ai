import { prisma } from "@/server/db/client";
import type { AiTaskType } from "@prisma/client";

export async function recordAiCallLog(input: {
  taskType: AiTaskType;
  modelId?: string;
  promptVersionId?: string;
  articleId?: string;
  tokenInput?: number;
  tokenOutput?: number;
  cost?: number;
  latencyMs?: number;
  status: "success" | "error" | "timeout";
  error?: string;
}): Promise<void> {
  await prisma.aiCallLog.create({
    data: {
      taskType: input.taskType,
      modelId: input.modelId,
      promptVersionId: input.promptVersionId,
      articleId: input.articleId,
      tokenInput: input.tokenInput,
      tokenOutput: input.tokenOutput,
      cost: input.cost,
      latencyMs: input.latencyMs,
      status: input.status,
      error: input.error,
    },
  });
}

/** AI 예산 가드(src/server/ai/budget.ts)용 — 실제 발생한 호출(재시도 포함) 건수를 센다. */
export async function countAiCallsSince(since: Date): Promise<number> {
  return prisma.aiCallLog.count({ where: { createdAt: { gte: since } } });
}
