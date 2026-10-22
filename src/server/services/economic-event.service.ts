import type { EconomicEvent } from "@prisma/client";
import {
  listUpcomingEvents,
  listAllEvents,
  createEvent,
  updateEvent,
  deleteEvent,
} from "@/server/repositories/economic-event.repository";
import { getOrgSettings, updateOrgSettings } from "@/server/services/settings.service";
import { findAdminUserIds } from "@/server/repositories/user.repository";
import { createNotificationForUsers } from "@/server/repositories/notification.repository";
import type {
  EconomicEventDto,
  AdminEconomicEvent,
  CreateEconomicEventInput,
  UpdateEconomicEventInput,
} from "@/lib/schemas/economic-event.schema";

function formatDisplayDate(d: Date): string {
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${mm}.${dd}`;
}

function toDisplayDto(e: EconomicEvent): EconomicEventDto {
  return { id: e.id, date: formatDisplayDate(e.eventDate), time: e.eventTime ?? "-", title: e.title, importance: e.importance };
}

function toAdminDto(e: EconomicEvent): AdminEconomicEvent {
  return {
    id: e.id,
    title: e.title,
    eventDate: e.eventDate.toISOString().slice(0, 10),
    eventTime: e.eventTime,
    importance: e.importance,
  };
}

/** 홈 화면 "경제 일정" 카드 — 오늘 이후 다가오는 일정만. */
export async function getUpcomingEvents(orgId: string): Promise<EconomicEventDto[]> {
  const rows = await listUpcomingEvents(orgId);
  return rows.map(toDisplayDto);
}

export async function getAllEventsForAdmin(orgId: string): Promise<AdminEconomicEvent[]> {
  const rows = await listAllEvents(orgId);
  return rows.map(toAdminDto);
}

/** 관리자가 일정을 건드릴 때마다 "마지막 갱신 시각"을 찍는다 — daily pipeline이 이 값을
 *  보고 2주 이상 지났으면 알림을 보낸다(keyword-watch.service.ts의 notifyKeywordWatchers와
 *  같은 "부가 기능 실패가 본 작업을 막으면 안 된다" 원칙은 여기선 해당 없음: 이건 본
 *  작업 자체의 일부라 그대로 두되, 실패해도 등록/수정 자체는 이미 끝난 뒤라 사용자에게
 *  영향 없다). */
async function markRefreshed(orgId: string): Promise<void> {
  try {
    await updateOrgSettings(orgId, { economicCalendarRefreshedAt: new Date().toISOString() });
  } catch (e) {
    console.error("[economic-event.service] failed to stamp economicCalendarRefreshedAt", e);
  }
}

export async function addEvent(orgId: string, input: CreateEconomicEventInput): Promise<AdminEconomicEvent> {
  const created = await createEvent({
    orgId,
    title: input.title,
    eventDate: new Date(input.eventDate),
    eventTime: input.eventTime ?? null,
    importance: input.importance,
  });
  await markRefreshed(orgId);
  return toAdminDto(created);
}

export async function editEvent(
  id: string,
  orgId: string,
  patch: UpdateEconomicEventInput
): Promise<AdminEconomicEvent | null> {
  const updated = await updateEvent(id, orgId, {
    ...(patch.title !== undefined ? { title: patch.title } : {}),
    ...(patch.eventDate !== undefined ? { eventDate: new Date(patch.eventDate) } : {}),
    ...(patch.eventTime !== undefined ? { eventTime: patch.eventTime } : {}),
    ...(patch.importance !== undefined ? { importance: patch.importance } : {}),
  });
  if (!updated) return null;
  await markRefreshed(orgId);
  return toAdminDto(updated);
}

export async function removeEvent(id: string, orgId: string): Promise<boolean> {
  const deleted = await deleteEvent(id, orgId);
  if (deleted) await markRefreshed(orgId);
  return deleted;
}

const STALE_AFTER_MS = 14 * 24 * 60 * 60 * 1000; // 2주

/**
 * daily pipeline에서 호출. "마지막 갱신"이 2주 이상 전(또는 한 번도 갱신한 적 없음)이면
 * 관리자 전원에게 인앱 알림을 보내고 알림 발송 시각을 찍는다. 같은 미갱신 기간 동안은
 * 하루 한 번 크론이 돌 때마다 또 알림을 보내지 않도록, "마지막 알림이 마지막 갱신보다
 * 나중이고 아직 2주가 안 지났으면" 건너뛴다 — 관리자가 일정을 고치면 refreshedAt이
 * 갱신되어 다음 미갱신 주기에 다시 알림이 나간다.
 */
export async function maybeNotifyEconomicCalendarStale(orgId: string): Promise<boolean> {
  const settings = await getOrgSettings(orgId);
  const refreshedAt = settings.economicCalendarRefreshedAt ? new Date(settings.economicCalendarRefreshedAt).getTime() : null;
  const stale = refreshedAt === null || Date.now() - refreshedAt >= STALE_AFTER_MS;
  if (!stale) return false;

  const reminderAt = settings.economicCalendarReminderSentAt
    ? new Date(settings.economicCalendarReminderSentAt).getTime()
    : null;
  const alreadyRemindedThisCycle =
    reminderAt !== null && (refreshedAt === null || reminderAt >= refreshedAt) && Date.now() - reminderAt < STALE_AFTER_MS;
  if (alreadyRemindedThisCycle) return false;

  const adminIds = await findAdminUserIds(orgId);
  await createNotificationForUsers(adminIds, {
    type: "economic_calendar_stale",
    title: "경제 일정 업데이트가 필요합니다",
    body: "홈 화면 경제 일정이 2주 이상 갱신되지 않았습니다. 다가오는 일정을 채워주세요.",
    link: "/admin/economic-events",
  });
  await updateOrgSettings(orgId, { economicCalendarReminderSentAt: new Date().toISOString() });
  return true;
}
