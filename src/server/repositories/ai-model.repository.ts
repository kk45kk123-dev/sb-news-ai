import { prisma } from "@/server/db/client";
import type { AiModel, AiTaskType } from "@prisma/client";

/** priority 오름차순(낮을수록 우선) — 1순위 실패 시 게이트웨이가 다음 모델로 폴백한다. */
export async function listActiveModelsForTask(taskType: AiTaskType): Promise<AiModel[]> {
  return prisma.aiModel.findMany({
    where: { isActive: true, taskTypes: { has: taskType } },
    orderBy: { priority: "asc" },
  });
}
