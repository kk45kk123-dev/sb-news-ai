import { env } from "@/config/env";

/**
 * F-07 임베딩 전용 어댑터. Anthropic엔 임베딩 API가 없어 OpenAI를 쓴다(docs/DECISIONS.md
 * 기존 계획). anthropic.provider.ts와 달리 공식 SDK를 추가하지 않고 REST를 직접 호출한다 —
 * 이 프로젝트가 쓰는 엔드포인트는 임베딩 하나뿐이라 SDK 전체를 들이는 비용이 안 맞는다.
 */
const EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";

export interface EmbedResult {
  embedding: number[];
  tokenInput: number;
}

export async function embedText(text: string, model: string): Promise<EmbedResult> {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const res = await fetch(EMBEDDINGS_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model, input: text }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenAI embeddings request failed (HTTP ${res.status}): ${body.slice(0, 300)}`);
  }

  const json = (await res.json()) as {
    data: { embedding: number[] }[];
    usage: { prompt_tokens: number };
  };
  const embedding = json.data[0]?.embedding;
  if (!embedding) {
    throw new Error("OpenAI embeddings response missing data[0].embedding");
  }

  return { embedding, tokenInput: json.usage.prompt_tokens };
}
