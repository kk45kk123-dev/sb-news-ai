import { prisma } from "@/server/db/client";
import type { Source, SourceStatus, SourceType } from "@prisma/client";

export async function listActiveSources(): Promise<Source[]> {
  return prisma.source.findMany({ where: { isActive: true } });
}

/** 관리자 콘솔용 — 비활성 출처도 포함해 전체를 보여준다 (F-10). */
export async function listAllSources(orgId: string): Promise<Source[]> {
  return prisma.source.findMany({ where: { orgId }, orderBy: { name: "asc" } });
}

export interface CreateSourceInput {
  orgId: string;
  name: string;
  type: SourceType;
  url: string;
  categoryHints: string[];
  credibility: number;
  fetchIntervalMin: number;
}

export async function createSource(input: CreateSourceInput): Promise<Source> {
  return prisma.source.create({
    data: { ...input, status: "needs_review" },
  });
}

export interface UpdateSourceInput {
  name?: string;
  url?: string;
  categoryHints?: string[];
  credibility?: number;
  fetchIntervalMin?: number;
  isActive?: boolean;
}

export async function updateSource(id: string, input: UpdateSourceInput): Promise<Source> {
  return prisma.source.update({ where: { id }, data: input });
}

export async function deleteSource(id: string): Promise<void> {
  await prisma.source.delete({ where: { id } });
}

export async function findSourceById(id: string): Promise<Source | null> {
  return prisma.source.findUnique({ where: { id } });
}

/**
 * "활성 + 마지막 수집이 fetch_interval_min 이상 지난" 출처를 조회한다.
 * idx_sources_active_due 부분 인덱스(prisma/migrations)를 겨냥한 쿼리다.
 * DB 레벨에서 출처별 간격을 계산할 수 없으므로(간격이 컬럼값이라 SQL에서 동적 비교 필요)
 * 활성 출처를 모두 가져온 뒤 애플리케이션에서 필터링한다 — 출처 수가 수백 개 규모라
 * 문제없다 (§17.1).
 */
export async function listDueSources(now: Date): Promise<Source[]> {
  const active = await prisma.source.findMany({ where: { isActive: true } });
  return active.filter((s) => isSourceDue(s, now));
}

export function isSourceDue(
  source: Pick<Source, "lastFetchedAt" | "fetchIntervalMin">,
  now: Date
): boolean {
  if (!source.lastFetchedAt) return true;
  const dueAt = new Date(source.lastFetchedAt.getTime() + source.fetchIntervalMin * 60_000);
  return dueAt <= now;
}

export async function updateSourceStatus(
  id: string,
  status: SourceStatus,
  consecutiveFailures: number
): Promise<void> {
  await prisma.source.update({
    where: { id },
    data: { status, consecutiveFailures, lastFetchedAt: new Date() },
  });
}
