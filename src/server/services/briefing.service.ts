import { prisma } from "@/server/db/client";
import { listBriefingCandidates } from "@/server/repositories/article.repository";
import { upsertBriefing, findBriefingByDate } from "@/server/repositories/briefing.repository";
import { generateBriefing, type BriefingCandidate } from "@/server/ai/gateway";

const BRIEFING_WINDOW_HOURS = 24; // F-03 "전일 18시~당일 07시"를 단순화 — 최근 24시간 수집분

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export interface BriefingDto {
  briefingDate: string;
  overview: string;
  items: {
    articleId: string;
    whyNow: string;
    soWhat: string;
    title: string | null;
    url: string | null;
    sbImpactScore: number | null;
  }[];
  followUps: string[];
  generatedAt: string;
  generatedBy: string;
}

async function toBriefingDto(b: {
  briefingDate: Date;
  overview: string;
  items: unknown;
  followUps: string[];
  generatedAt: Date;
  generatedBy: string;
}): Promise<BriefingDto> {
  const rawItems = Array.isArray(b.items)
    ? (b.items as { article_id: string; why_now: string; so_what: string }[])
    : [];

  const articles = await prisma.article.findMany({
    where: { id: { in: rawItems.map((i) => i.article_id) } },
    include: { analyses: { where: { isCurrent: true }, take: 1 } },
  });
  const articleById = new Map(articles.map((a) => [a.id, a]));

  return {
    briefingDate: b.briefingDate.toISOString().slice(0, 10),
    overview: b.overview,
    items: rawItems.map((i) => {
      const article = articleById.get(i.article_id);
      return {
        articleId: i.article_id,
        whyNow: i.why_now,
        soWhat: i.so_what,
        title: article?.title ?? null,
        url: article?.url ?? null,
        sbImpactScore: article?.analyses[0]?.sbImpactScore ?? null,
      };
    }),
    followUps: b.followUps,
    generatedAt: b.generatedAt.toISOString(),
    generatedBy: b.generatedBy,
  };
}

export async function getBriefingForDate(orgId: string, date: Date): Promise<BriefingDto | null> {
  const briefing = await findBriefingByDate(orgId, startOfDay(date));
  return briefing ? toBriefingDto(briefing) : null;
}

/**
 * F-03: 뉴스가 0건이면 브리핑을 만들지 않는다(호출부가 빈 상태를 보여준다).
 * 1~4건이면 "있는 만큼만 생성"한다 — generateBriefing의 zod 스키마가 items를 최소 1개만
 * 요구하므로 그대로 통과한다.
 */
export async function generateTodaysBriefing(
  orgId: string,
  generatedBy: "auto" | "manual" = "manual"
): Promise<BriefingDto | null> {
  const now = new Date();
  const dateFrom = new Date(now.getTime() - BRIEFING_WINDOW_HOURS * 60 * 60 * 1000);
  const candidates = await listBriefingCandidates(orgId, dateFrom, now);

  if (candidates.length === 0) return null;

  const briefingCandidates: BriefingCandidate[] = candidates.map((a) => ({
    id: a.id,
    title: a.title,
    summaryLines: a.analyses[0]?.summaryLines ?? [],
    sbImpactScore: a.analyses[0]?.sbImpactScore ?? 1,
  }));

  const result = await generateBriefing(briefingCandidates);

  const saved = await upsertBriefing({
    orgId,
    briefingDate: startOfDay(now),
    overview: result.output.overview,
    items: result.output.items,
    followUps: result.output.follow_ups,
    modelId: result.model.id,
    promptVersionId: result.promptVersion.id,
    generatedBy,
  });

  return toBriefingDto(saved);
}
