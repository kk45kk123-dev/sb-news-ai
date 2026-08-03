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

let client: Anthropic | null = null;
function getClient(): Anthropic {
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
