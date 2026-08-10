// 매직 넘버 금지 (§18.1) — 파이프라인 관련 상수는 여기서만 관리한다.

export const SOURCE_MAX_CONSECUTIVE_FAILURES = 3; // §F-01: 3회 연속 실패 시 status='error'

export const RAW_CONTENT_RETENTION_DAYS = 7; // §8.2

// 무료 티어(Vercel Hobby는 크론을 하루 1회로 제한)에 맞춰 BullMQ 상시 워커 대신
// 하루 1회 Vercel Cron이 run-daily-pipeline.ts를 호출하는 구조로 바뀌었다
// (vercel.json의 crons 항목 참고). 아래 시각은 그 크론을 몇 시(KST)에 맞출지의
// 기준값일 뿐 코드에서 직접 참조하지는 않는다 — vercel.json의 UTC 스케줄과
// 짝을 맞춰서 관리한다.
// F-03: "매일 정해진 시각(기본 07:30)에... 생성" — vercel.json: "30 22 * * *" (UTC) = 07:30 KST.
export const BRIEFING_GENERATION_HOUR_KST = "07:30";
