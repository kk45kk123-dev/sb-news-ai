import { z } from "zod";
import {
  listAllSources,
  findSourceById,
  createSource,
  updateSource,
  deleteSource,
  updateSourceStatus,
} from "@/server/repositories/source.repository";
import { getCollector } from "@/server/collectors/registry";
import { collectQueue } from "@/server/pipeline/queues";
import type { Source } from "@prisma/client";

export const createSourceSchema = z.object({
  name: z.string().trim().min(1).max(200),
  type: z.enum(["rss", "api", "scrape"]),
  url: z.string().url(),
  categoryHints: z.array(z.string()).default([]),
  credibility: z.number().int().min(1).max(5).default(3),
  fetchIntervalMin: z.number().int().min(5).max(1440).default(30),
});

export const updateSourceSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  url: z.string().url().optional(),
  categoryHints: z.array(z.string()).optional(),
  credibility: z.number().int().min(1).max(5).optional(),
  fetchIntervalMin: z.number().int().min(5).max(1440).optional(),
  isActive: z.boolean().optional(),
});

export async function listSources(orgId: string): Promise<Source[]> {
  return listAllSources(orgId);
}

export async function addSource(orgId: string, input: z.infer<typeof createSourceSchema>): Promise<Source> {
  return createSource({ orgId, ...input });
}

export async function editSource(id: string, input: z.infer<typeof updateSourceSchema>): Promise<Source> {
  return updateSource(id, input);
}

export async function removeSource(id: string): Promise<void> {
  await deleteSource(id);
}

export interface TestSourceResult {
  ok: boolean;
  itemCount: number;
  preview: { title: string; url: string; publishedAt: string }[];
  error?: string;
}

const TEST_PREVIEW_LIMIT = 5;

/**
 * F-10: "연결 테스트 버튼(실제 호출해 파싱 결과 미리보기)". 저장하지 않고 실제로 fetch+parse만
 * 해본다. 성공하면 출처 status를 'ok'로, 실패하면 'error'로 갱신해 목록에서 바로 보이게 한다.
 */
export async function testSourceConnection(id: string): Promise<TestSourceResult> {
  const source = await findSourceById(id);
  if (!source) {
    return { ok: false, itemCount: 0, preview: [], error: "출처를 찾을 수 없습니다." };
  }

  try {
    const collector = getCollector(source.type);
    const items = await collector.collect({
      id: source.id,
      name: source.name,
      url: source.url,
      config: source.config as Record<string, unknown>,
    });

    await updateSourceStatus(source.id, "ok", 0);

    return {
      ok: true,
      itemCount: items.length,
      preview: items
        .slice(0, TEST_PREVIEW_LIMIT)
        .map((i) => ({ title: i.title, url: i.url, publishedAt: i.publishedAt.toISOString() })),
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await updateSourceStatus(source.id, "error", source.consecutiveFailures);
    return { ok: false, itemCount: 0, preview: [], error: message };
  }
}

/** F-10: "지금 수집" — 스케줄을 기다리지 않고 즉시 collect 잡을 큐에 넣는다. */
export async function triggerFetchNow(id: string): Promise<void> {
  const source = await findSourceById(id);
  if (!source) throw new Error("출처를 찾을 수 없습니다.");
  await collectQueue.add("collect", { sourceId: id });
}
