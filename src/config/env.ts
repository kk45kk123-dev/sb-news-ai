import { z } from "zod";

/**
 * Infra-level secrets and connection strings only. Business-configurable
 * values (news sources, prompts, briefing schedule, categories, AI model
 * selection) live in the DB and are managed from /admin — never here.
 * See PROJECT_SPEC.md §21 "개발 원칙".
 */
const optionalString = z.preprocess(
  (v) => (v === "" ? undefined : v),
  z.string().min(1).optional()
);
const optionalUrl = z.preprocess((v) => (v === "" ? undefined : v), z.string().url().optional());
const optionalPositiveInt = z.preprocess(
  (v) => (v === "" || v === undefined ? undefined : Number(v)),
  z.number().int().positive().optional()
);
const optionalBoolean = z.preprocess(
  (v) => (v === "" || v === undefined ? undefined : v === "true" || v === "1"),
  z.boolean().optional()
);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  APP_BASE_URL: z.string().url(),
  ANTHROPIC_API_KEY: optionalString,
  OPENAI_API_KEY: optionalString,
  HTTP_PROXY: optionalUrl,
  HTTPS_PROXY: optionalUrl,
  /** Vercel Cron이 /api/cron/daily-pipeline을 호출할 때 붙이는 Authorization 헤더 검증용. */
  CRON_SECRET: optionalString,
  /** AI 예산 가드(src/server/ai/budget.ts) — 최근 24시간 ai_call_logs 건수 상한. 미설정 시 기본값 300. */
  AI_DAILY_CALL_LIMIT: optionalPositiveInt,
  /** AI 기능 긴급 차단 스위치. false로 설정하면 ANTHROPIC_API_KEY가 살아있어도 어떤 AI
   *  호출도 나가지 않는다(anthropic.provider.ts에서 검사) — Anthropic 콘솔에서 키를
   *  재발급하지 않고도 즉시 비용 발생을 막을 수 있는 레버. 미설정 시 기존처럼 활성(true). */
  AI_ENABLED: optionalBoolean,
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  // 예전엔 ANTHROPIC_API_KEY/OPENAI_API_KEY 둘 다 없으면 앱 자체가 부팅에 실패했다 —
  // 그러면 "AI 비용이 걱정되니 키를 지운다"는 정상적인 대응이 사이트 전체를 죽이는
  // 셈이 된다. 이제 키가 없거나 AI_ENABLED=false면 AI 관련 호출만 그 자리에서
  // 실패하고(anthropic.provider.ts), 나머지 서비스는 그대로 동작한다.
  return parsed.data;
}

export const env = loadEnv();
