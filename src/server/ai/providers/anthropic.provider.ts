import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/config/env";

export interface ProviderCallInput {
  modelKey: string;
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
}

export interface ProviderCallResult {
  text: string;
  tokenInput: number;
  tokenOutput: number;
}

const DEFAULT_MAX_TOKENS = 4096;

/** AI_ENABLED=false일 때 이 에러가 던져진다 — 호출부(gateway.ts, admin ingest 라우트)가
 *  이미 일반 에러 처리 경로를 갖고 있어 별도 분기 없이도 "일시적으로 실패"로 처리된다. */
export class AiDisabledError extends Error {
  constructor() {
    super("AI 기능이 현재 비활성화되어 있습니다.");
  }
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  // 이 파일이 앱에서 Anthropic API를 실제로 호출하는 유일한 지점이다 — 여기 하나만
  // 막으면 gateway.ts 경유 호출과 admin ingest 라우트의 직접 호출(ADR-007 예외 경로)
  // 둘 다 동시에 막힌다. API 키를 재발급하지 않고도 즉시 전체 AI 기능을 끌 수 있는
  // 긴급 스위치.
  if (env.AI_ENABLED === false) {
    throw new AiDisabledError();
  }
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }
  client ??= new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return client;
}

export async function callAnthropic(input: ProviderCallInput): Promise<ProviderCallResult> {
  const res = await getClient().messages.create({
    model: input.modelKey,
    max_tokens: input.maxTokens ?? DEFAULT_MAX_TOKENS,
    system: input.systemPrompt,
    messages: [{ role: "user", content: input.userPrompt }],
  });

  const text = res.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  return {
    text,
    tokenInput: res.usage.input_tokens,
    tokenOutput: res.usage.output_tokens,
  };
}
