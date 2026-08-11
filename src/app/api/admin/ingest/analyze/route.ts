import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { CATEGORIES } from "@/data/categories";
import { ingestAnalyzeRequestSchema, ingestAnalyzeOutputSchema } from "@/lib/schemas/ingest.schema";
import { extractArticleFromUrl, ArticleExtractionError } from "@/server/ingest/extract-article";
import { callAnthropic } from "@/server/ai/providers/anthropic.provider";
import { extractJson } from "@/server/ai/json-extract";
import { getAuthContext, hasRole, verifyCsrf } from "@/server/auth/guard";
import { checkRateLimit } from "@/server/auth/rate-limit";

export const runtime = "nodejs";
// Default Vercel function timeout (10s on Hobby) can be too tight for a
// Claude call plus a possible schema-retry — raise the ceiling explicitly.
// (Hobby plans are hard-capped at 10s regardless; Pro respects this value.)
export const maxDuration = 60;

const MODEL_KEY = "claude-haiku-4-5";
const MAX_BODY_CHARS = 6000;
const MAX_ATTEMPTS = 2;
// This endpoint pays for a Claude call on every request — cap it well below
// what a legitimate admin doing manual article entry would ever need.
const RATE_LIMIT_PER_HOUR = 20;

function buildSystemPrompt(): string {
  const categoryList = CATEGORIES.map((c) => `- ${c.id}: ${c.name}`).join("\n");
  return `당신은 저축은행 업계 관점의 경제뉴스 편집자입니다. 주어진 기사 본문을 분석해 아래 JSON 스키마에 맞는 결과만 출력하세요. 다른 설명, 코드블록 표시 없이 순수 JSON 객체 하나만 반환합니다.

{
  "title": "기사 제목 (한국어, 뉴스 헤드라인 스타일)",
  "summaryBullets": ["요약 문장 1", "요약 문장 2", "요약 문장 3"],
  "categoryId": "아래 카테고리 목록 중 하나의 id",
  "keywords": ["핵심 키워드 3~6개"],
  "tags": ["짧은 태그 2~4개"]
}

카테고리 목록:
${categoryList}

규칙:
- title: 본문에 이미 좋은 제목이 있으면 그대로 사용하고, 없거나 부적절하면(언론사명뿐이거나 너무 짧으면) 본문 내용을 바탕으로 새로 작성하세요.
- summaryBullets: 정확히 3개의 완결된 한국어 문장. 각 문장은 본문의 핵심 사실을 담아야 합니다.
- categoryId: 반드시 위 목록의 id 중 하나를 정확히 그대로 사용하세요.
- keywords: 본문에 실제로 등장하는 고유명사/용어 위주.
- tags: keywords보다 짧고 일반적인 분류어.`;
}

function buildUserPrompt(body: string, titleHint: string | null): string {
  const truncated = body.length > MAX_BODY_CHARS ? `${body.slice(0, MAX_BODY_CHARS)}\n\n(이하 생략)` : body;
  return `${titleHint ? `추출된 제목 후보: ${titleHint}\n\n` : ""}기사 본문:\n${truncated}`;
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  if (!hasRole(ctx.user.role, ["admin"])) {
    return NextResponse.json({ error: "기사 등록 권한이 없습니다." }, { status: 403 });
  }
  if (!verifyCsrf(req, ctx)) {
    return NextResponse.json({ error: "CSRF 토큰이 유효하지 않습니다." }, { status: 403 });
  }

  const { allowed } = await checkRateLimit(`ratelimit:ingest:${ctx.user.id}`, RATE_LIMIT_PER_HOUR, 3600);
  if (!allowed) {
    return NextResponse.json(
      { error: `기사 등록은 시간당 ${RATE_LIMIT_PER_HOUR}회까지 가능합니다. 잠시 후 다시 시도해주세요.` },
      { status: 429 }
    );
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const parsedInput = ingestAnalyzeRequestSchema.safeParse(payload);
  if (!parsedInput.success) {
    return NextResponse.json({ error: parsedInput.error.issues[0]?.message ?? "입력값을 확인해주세요." }, { status: 400 });
  }
  const input = parsedInput.data;

  let body: string;
  let extractedTitle: string | null = null;
  let extractedImageUrl: string | null = null;
  const sourceUrl = input.mode === "url" ? input.url! : null;

  if (input.mode === "url") {
    try {
      const extracted = await extractArticleFromUrl(input.url!);
      body = extracted.text;
      extractedTitle = extracted.title;
      extractedImageUrl = extracted.imageUrl;
    } catch (e) {
      const message = e instanceof ArticleExtractionError ? e.message : "본문 추출 중 오류가 발생했습니다.";
      return NextResponse.json({ error: message }, { status: 422 });
    }
  } else {
    body = input.text!.trim();
  }

  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(body, extractedTitle);

  let lastError: string = "AI 분석에 실패했습니다.";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const startedAt = Date.now();
    try {
      const result = await callAnthropic({
        modelKey: MODEL_KEY,
        systemPrompt,
        userPrompt:
          attempt === 1 ? userPrompt : `${userPrompt}\n\n(이전 응답이 JSON 스키마를 위반했습니다. 반드시 유효한 JSON 객체 하나만 출력하세요.)`,
        maxTokens: 1024,
      });
      const latencyMs = Date.now() - startedAt;

      const parsedJson = extractJson(result.text);
      const validated = ingestAnalyzeOutputSchema.safeParse(parsedJson);
      if (!validated.success) {
        lastError = "AI 응답 형식이 올바르지 않습니다.";
        continue;
      }

      return NextResponse.json({
        analysis: validated.data,
        body,
        sourceUrl,
        extractedTitle,
        extractedImageUrl,
        modelKey: MODEL_KEY,
        tokenInput: result.tokenInput,
        tokenOutput: result.tokenOutput,
        latencyMs,
      });
    } catch (e) {
      if (e instanceof Anthropic.AuthenticationError) {
        lastError = "ANTHROPIC_API_KEY가 유효하지 않습니다. 환경 변수를 확인해주세요.";
      } else if (e instanceof Anthropic.RateLimitError) {
        lastError = "Anthropic API 호출 한도를 초과했습니다. 잠시 후 다시 시도해주세요.";
      } else if (e instanceof Error && e.message.includes("ANTHROPIC_API_KEY")) {
        lastError = "ANTHROPIC_API_KEY가 설정되지 않았습니다.";
      } else {
        lastError = "AI 분석 요청 중 오류가 발생했습니다.";
      }
    }
  }

  return NextResponse.json({ error: lastError }, { status: 502 });
}
