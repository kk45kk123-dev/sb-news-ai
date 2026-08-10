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
import { runCollectJob } from "@/server/pipeline/collect.job";
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

export interface FetchNowResult {
  itemsFound: number;
  itemsNew: number;
  error?: string;
}

/**
 * F-10: "지금 수집" — 스케줄(하루 1회 크론)을 기다리지 않고 즉시 실행한다.
 * 예전에는 BullMQ 큐에 넣기만 하고 워커가 나중에 처리했지만, 지금은 워커가 상시
 * 실행되지 않는 환경(Vercel 서버리스)이라 그 방식은 아무 일도 하지 않는 것과
 * 같았다 — 그래서 요청 안에서 바로 수집을 끝내고 결과를 반환한다.
 *
 * runCollectJob은 RSS fetch 자체가 실패하면 예외를 던진다(daily-pipeline이 출처별로
 * 격리해서 잡기 위함) — 여기서는 그 예외를 "출처를 못 찾음"과 구분해 정상적인
 * 실패 결과로 바꿔서 반환한다. 관리자가 버튼을 눌렀는데 알 수 없는 에러 화면을
 * 보는 대신, "이 출처는 지금 실패했다"는 걸 그대로 보여주기 위함이다.
 */
export async function triggerFetchNow(id: string): Promise<FetchNowResult> {
  const source = await findSourceById(id);
  if (!source) throw new Error("출처를 찾을 수 없습니다.");

  try {
    return await runCollectJob({ sourceId: id });
  } catch (e) {
    return { itemsFound: 0, itemsNew: 0, error: e instanceof Error ? e.message : String(e) };
  }
}
