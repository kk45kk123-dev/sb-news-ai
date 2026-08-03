import { prisma } from "@/server/db/client";
import type { Briefing, Prisma } from "@prisma/client";

export interface UpsertBriefingInput {
  orgId: string;
  briefingDate: Date;
  overview: string;
  items: Prisma.InputJsonValue;
  followUps: string[];
  modelId?: string;
  promptVersionId?: string;
  generatedBy: "auto" | "manual";
}

/**
 * F-03: 브리핑은 원칙적으로 불변이지만, 관리자가 "수동 재생성"할 수 있다는 수용 기준이 있어
 * 날짜당 최신 1건을 upsert한다(브리핑 버전 이력은 Phase 2에서 필요해지면 별도 테이블로 분리 —
 * docs/DB_SCHEMA.md briefings 섹션 주석 참조).
 */
export async function upsertBriefing(input: UpsertBriefingInput): Promise<Briefing> {
  return prisma.briefing.upsert({
    where: { orgId_briefingDate: { orgId: input.orgId, briefingDate: input.briefingDate } },
    update: {
      overview: input.overview,
      items: input.items,
      followUps: input.followUps,
      modelId: input.modelId,
      promptVersionId: input.promptVersionId,
      generatedAt: new Date(),
      generatedBy: input.generatedBy,
    },
    create: {
      orgId: input.orgId,
      briefingDate: input.briefingDate,
      overview: input.overview,
      items: input.items,
      followUps: input.followUps,
      modelId: input.modelId,
      promptVersionId: input.promptVersionId,
      generatedBy: input.generatedBy,
    },
  });
}

export async function findBriefingByDate(orgId: string, briefingDate: Date): Promise<Briefing | null> {
  return prisma.briefing.findUnique({
    where: { orgId_briefingDate: { orgId, briefingDate } },
  });
}
