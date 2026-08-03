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
