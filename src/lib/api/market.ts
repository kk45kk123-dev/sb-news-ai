import { apiFetch } from "@/lib/api/http";
import type { MarketSnapshot } from "@/lib/schemas/market.schema";

export async function getMarketSnapshot(): Promise<MarketSnapshot> {
  return apiFetch<MarketSnapshot>("/api/v1/market");
}
