import { prisma } from "@/server/db/client";
import type { AiTaskType, PromptVersion } from "@prisma/client";

export async function loadActivePromptVersion(taskType: AiTaskType): Promise<PromptVersion> {
  const version = await prisma.promptVersion.findFirst({
    where: { isActive: true, prompt: { taskType } },
    orderBy: { version: "desc" },
  });
  if (!version) {
    throw new Error(`No active prompt_version found for task_type=${taskType}`);
  }
  return version;
}

/** `{key}` 형태의 플레이스홀더를 치환한다. 매칭되지 않는 키는 그대로 남긴다(무음 실패 방지). */
export function renderTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(variables, key) ? variables[key]! : match
  );
}
