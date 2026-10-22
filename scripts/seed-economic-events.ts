/**
 * 경제 일정(economic_events)이 비어있을 때만 한 번 "현재 알려진 다가오는 일정"으로
 * 채운다 — 배포 파이프라인(build 스크립트)에서 매번 돌아가지만, 테이블에 이미 행이
 * 있으면(관리자가 직접 넣었든, 이 스크립트가 예전에 넣었든) 아무것도 하지 않는다.
 * 그래서 admin 화면에서 관리자가 수정/삭제한 내용을 다음 배포가 덮어쓰지 않는다.
 *
 * 날짜 근거(작성 시점 2026-10-22 기준, 한국은행/Fed/BLS 공식 일정 확인):
 * - FOMC 10월 회의: 연준 확정 일정(10/27~28), 결과는 현지 10/28 14:00 ET 발표
 *   (10월 말 EDT 기준 → 한국시간 다음날 03:00)
 * - 미국 10월 비농업고용지표: BLS 발표 일정(11/6 08:30 ET, 11월은 EST → 22:30 KST)
 * - 미국 10월 CPI: BLS 발표 일정(11/10 08:30 ET → 22:30 KST)
 * - 저축은행 3분기 경영실적: 공식 확정 일자 아님 — 작년(2025) 11/13 저축은행중앙회 발표
 *   전례 기준 잠정치로 등록(제목에 "잠정" 명시)
 * - 한국은행 금융통화위원회: 2026년 확정 회의 일정 중 다음 회차(11/26)
 */
import { PrismaClient, type EventImportance } from "@prisma/client";

const prisma = new PrismaClient();
const DEFAULT_ORG_ID = "00000000-0000-0000-0000-000000000001";

const INITIAL_EVENTS: {
  title: string;
  eventDate: string;
  eventTime: string | null;
  importance: EventImportance;
}[] = [
  { title: "FOMC 10월 회의 결과 발표 (현지 10/28)", eventDate: "2026-10-29", eventTime: "03:00", importance: "high" },
  { title: "미국 10월 비농업고용지표 발표", eventDate: "2026-11-06", eventTime: "22:30", importance: "high" },
  { title: "미국 10월 소비자물가지수(CPI) 발표", eventDate: "2026-11-10", eventTime: "22:30", importance: "high" },
  { title: "저축은행 3분기 경영실적 발표(잠정)", eventDate: "2026-11-13", eventTime: null, importance: "medium" },
  { title: "한국은행 금융통화위원회 통화정책방향 결정회의", eventDate: "2026-11-26", eventTime: "09:00", importance: "high" },
];

async function main() {
  const existingCount = await prisma.economicEvent.count({ where: { orgId: DEFAULT_ORG_ID } });
  if (existingCount > 0) {
    console.log(`✔ economic_events: 이미 ${existingCount}건 있어 건너뜀 (관리자 화면에서 관리 중)`);
    return;
  }

  await prisma.economicEvent.createMany({
    data: INITIAL_EVENTS.map((e) => ({
      orgId: DEFAULT_ORG_ID,
      title: e.title,
      eventDate: new Date(e.eventDate),
      eventTime: e.eventTime,
      importance: e.importance,
    })),
  });

  console.log(`✔ economic_events: 초기 일정 ${INITIAL_EVENTS.length}건 등록`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
