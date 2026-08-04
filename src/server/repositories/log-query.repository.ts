import { prisma } from "@/server/db/client";

const DEFAULT_LOG_LIMIT = 50;
const MAX_LOG_LIMIT = 200; // §18.1: 모든 목록 API에 상한

export async function listCrawlLogs(offset: number, limit = DEFAULT_LOG_LIMIT) {
  const take = Math.min(limit, MAX_LOG_LIMIT);
  const [items, total] = await Promise.all([
    prisma.crawlLog.findMany({
      include: { source: { select: { name: true } } },
      orderBy: { startedAt: "desc" },
      skip: offset,
      take,
    }),
    prisma.crawlLog.count(),
  ]);
  return { items, total };
}

export async function listAiCallLogs(offset: number, limit = DEFAULT_LOG_LIMIT) {
  const take = Math.min(limit, MAX_LOG_LIMIT);
  const [items, total] = await Promise.all([
    prisma.aiCallLog.findMany({
      include: { model: { select: { displayName: true } } },
      orderBy: { createdAt: "desc" },
      skip: offset,
      take,
    }),
    prisma.aiCallLog.count(),
  ]);
  return { items, total };
}

export async function listAuditLogs(orgId: string, offset: number, limit = DEFAULT_LOG_LIMIT) {
  const take = Math.min(limit, MAX_LOG_LIMIT);
  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where: { orgId },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip: offset,
      take,
    }),
    prisma.auditLog.count({ where: { orgId } }),
  ]);
  return { items, total };
}
