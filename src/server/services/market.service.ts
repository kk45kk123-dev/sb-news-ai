import { redis } from "@/server/redis/client";
import { MARKET_INDICATORS } from "@/data/market";
import type { MarketIndicator, MarketSnapshot } from "@/lib/schemas/market.schema";

const SNAPSHOT_CACHE_KEY = "market:snapshot";
const SNAPSHOT_CACHE_TTL_SECONDS = 120;
const LAST_GOOD_KEY_PREFIX = "market:last-good:";
const FETCH_TIMEOUT_MS = 5000;

// 코스피/코스닥/원달러는 Yahoo Finance의 비공식(무인증) 차트 API에서 가져온다 — 무료지만
// 공식 API가 아니라 언제든 형식이 바뀌거나 막힐 수 있다. 기준금리는 무료 실시간 소스가
// 없고(한국은행 ECOS는 API 키 발급 필요) 변경 빈도도 낮아(연 8회 금통위) 정적 값으로 둔다.
const LIVE_SYMBOLS: { id: string; label: string; ticker: string; decimals: number }[] = [
  { id: "kospi", label: "코스피", ticker: "%5EKS11", decimals: 2 },
  { id: "kosdaq", label: "코스닥", ticker: "%5EKQ11", decimals: 2 },
  { id: "usdkrw", label: "원/달러", ticker: "KRW=X", decimals: 2 },
];

interface YahooChartMeta {
  regularMarketPrice?: number;
  previousClose?: number;
  chartPreviousClose?: number;
}
interface YahooChartResponse {
  chart?: {
    result?: {
      meta?: YahooChartMeta;
      indicators?: { quote?: { close?: (number | null)[] }[] };
    }[];
    error?: unknown;
  };
}

function formatValue(n: number, decimals: number): string {
  return n.toLocaleString("ko-KR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function formatChangeLabel(diff: number, decimals: number): string {
  const sign = diff > 0 ? "+" : diff < 0 ? "" : "";
  return `${sign}${diff.toFixed(decimals)}`;
}

async function fetchLiveIndicator(sym: (typeof LIVE_SYMBOLS)[number]): Promise<MarketIndicator | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${sym.ticker}?range=5d&interval=1d`,
      { signal: controller.signal, headers: { "user-agent": "Mozilla/5.0" } }
    );
    if (!res.ok) return null;
    const body: YahooChartResponse = await res.json();
    const result = body.chart?.result?.[0];
    const price = result?.meta?.regularMarketPrice;
    const prevClose = result?.meta?.previousClose ?? result?.meta?.chartPreviousClose;
    if (typeof price !== "number" || typeof prevClose !== "number") return null;

    const closes = (result?.indicators?.quote?.[0]?.close ?? []).filter((v): v is number => typeof v === "number");
    const trend = closes.length >= 2 ? closes.slice(-7) : [prevClose, price];
    const diff = price - prevClose;

    return {
      id: sym.id,
      label: sym.label,
      value: formatValue(price, sym.decimals),
      change: diff,
      changeLabel: formatChangeLabel(diff, sym.decimals),
      trend,
      isLive: true,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function staticBaseRate(): MarketIndicator {
  const fallback = MARKET_INDICATORS.find((m) => m.id === "base-rate")!;
  return { ...fallback, isLive: false };
}

function staticFallback(id: string): MarketIndicator {
  const fallback = MARKET_INDICATORS.find((m) => m.id === id);
  return fallback ? { ...fallback, isLive: false } : { id, label: id, value: "-", change: 0, changeLabel: "-", trend: [], isLive: false };
}

async function resolveIndicator(sym: (typeof LIVE_SYMBOLS)[number]): Promise<MarketIndicator> {
  const live = await fetchLiveIndicator(sym);
  const lastGoodKey = LAST_GOOD_KEY_PREFIX + sym.id;

  if (live) {
    await redis.set(lastGoodKey, JSON.stringify(live), "EX", 60 * 60 * 24 * 7).catch(() => {});
    return live;
  }

  const cached = await redis.get(lastGoodKey).catch(() => null);
  if (cached) {
    try {
      return { ...(JSON.parse(cached) as MarketIndicator), isLive: false };
    } catch {
      // fall through to static default
    }
  }
  return staticFallback(sym.id);
}

export async function getMarketSnapshot(): Promise<MarketSnapshot> {
  const cached = await redis.get(SNAPSHOT_CACHE_KEY).catch(() => null);
  if (cached) {
    try {
      return JSON.parse(cached) as MarketSnapshot;
    } catch {
      // corrupted cache entry — fall through and refetch
    }
  }

  const live = await Promise.all(LIVE_SYMBOLS.map(resolveIndicator));
  const snapshot: MarketSnapshot = {
    items: [...live, staticBaseRate()],
    fetchedAt: new Date().toISOString(),
  };

  await redis.set(SNAPSHOT_CACHE_KEY, JSON.stringify(snapshot), "EX", SNAPSHOT_CACHE_TTL_SECONDS).catch(() => {});
  return snapshot;
}
