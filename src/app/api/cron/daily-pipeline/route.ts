import type { NextRequest } from "next/server";
import { apiOk, apiError } from "@/lib/api-response";
import { ErrorCode } from "@/types/errors";
import { env } from "@/config/env";
import { runDailyPipeline } from "@/server/pipeline/run-daily-pipeline";

// Vercel Hobby 플랜 서버리스 함수의 실행시간 상한에 맞춘 값. run-daily-pipeline.ts의
// TIME_BUDGET_MS(50s)가 이보다 먼저 개입해 여유를 두고 스스로 정리하고 끝낸다.
export const maxDuration = 60;

/**
 * Vercel Cron 전용 엔드포인트 (vercel.json의 crons 항목이 매일 호출한다).
 * Vercel은 CRON_SECRET 환경변수가 설정돼 있으면 크론 요청에 자동으로
 * `Authorization: Bearer <CRON_SECRET>` 헤더를 붙인다 — 그 값과 대조해 크론이
 * 아닌 외부 요청이 이 무거운(=비용이 드는) 엔드포인트를 호출하지 못하게 막는다.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!env.CRON_SECRET || authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return apiError(ErrorCode.UNAUTHORIZED, "인증되지 않은 요청입니다.", 401);
  }

  const result = await runDailyPipeline();
  return apiOk(result);
}
