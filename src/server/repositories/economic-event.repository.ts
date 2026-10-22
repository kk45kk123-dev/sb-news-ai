import { prisma } from "@/server/db/client";
import type { EconomicEvent } from "@prisma/client";

/** 홈 화면 "경제 일정" 카드용 — 오늘 이후 일정만, 날짜순으로. */
export async function listUpcomingEvents(orgId: string, limit = 5): Promise<EconomicEvent[]> {
  const todayUtcMidnight = new Date(new Date().toISOString().slice(0, 10));
  return prisma.economicEvent.findMany({
    where: { orgId, eventDate: { gte: todayUtcMidnight } },
    orderBy: { eventDate: "asc" },
    take: limit,
  });
}

/** 관리자 화면용 — 지난 일정도 포함해 전부 보여준다(최근 날짜 우선). */
export async function listAllEvents(orgId: string): Promise<EconomicEvent[]> {
  return prisma.economicEvent.findMany({ where: { orgId }, orderBy: { eventDate: "desc" } });
}

export interface CreateEventInput {
  orgId: string;
  title: string;
  eventDate: Date;
  eventTime?: string | null;
  importance: "high" | "medium" | "low";
}

export async function createEvent(input: CreateEventInput): Promise<EconomicEvent> {
  return prisma.economicEvent.create({ data: input });
}

export interface UpdateEventInput {
  title?: string;
  eventDate?: Date;
  eventTime?: string | null;
  importance?: "high" | "medium" | "low";
}

export async function updateEvent(id: string, orgId: string, patch: UpdateEventInput): Promise<EconomicEvent | null> {
  const existing = await prisma.economicEvent.findFirst({ where: { id, orgId } });
  if (!existing) return null;
  return prisma.economicEvent.update({ where: { id }, data: patch });
}

export async function deleteEvent(id: string, orgId: string): Promise<boolean> {
  const result = await prisma.economicEvent.deleteMany({ where: { id, orgId } });
  return result.count > 0;
}
