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
  if (!parsed.data.ANTHROPIC_API_KEY && !parsed.data.OPENAI_API_KEY) {
    throw new Error(
      "At least one of ANTHROPIC_API_KEY or OPENAI_API_KEY must be set (AI Gateway needs a provider)."
    );
  }
  return parsed.data;
}

export const env = loadEnv();
