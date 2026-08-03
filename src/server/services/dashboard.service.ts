import { prisma } from "@/server/db/client";

const HIGH_IMPACT_THRESHOLD = 4; // §4.2 대시보드 "고영향(4~5점)"

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export interface DashboardStats {
  todayCollectedCount: number;
  highImpactCount: number;
  unreadCount: number;
  lastCollectedAt: string | null;
}

export async function getDashboardStats(orgId: string, userId: string): Promise<DashboardStats> {
  const since = startOfToday();

  const [todayCollectedCount, highImpactCount, unreadCount, lastCrawl] = await Promise.all([
    prisma.article.count({ where: { orgId, collectedAt: { gte: since } } }),
    prisma.article.count({
      where: {
        orgId,
        collectedAt: { gte: since },
        analyses: { some: { isCurrent: true, sbImpactScore: { gte: HIGH_IMPACT_THRESHOLD } } },
      },
    }),
    prisma.article.count({
      where: {
        orgId,
        collectedAt: { gte: since },
        userStates: { none: { userId, isRead: true } },
      },
    }),
    prisma.crawlLog.findFirst({
      where: { status: "success" },
      orderBy: { finishedAt: "desc" },
      select: { finishedAt: true },
    }),
  ]);

  return {
    todayCollectedCount,
    highImpactCount,
    unreadCount,
    lastCollectedAt: lastCrawl?.finishedAt?.toISOString() ?? null,
  };
}
