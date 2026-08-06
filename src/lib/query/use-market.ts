"use client";

import { useQuery } from "@tanstack/react-query";
import * as marketApi from "@/lib/api/market";
import { queryKeys } from "@/lib/query/keys";

const REFRESH_INTERVAL_MS = 2 * 60 * 1000;

export function useMarketQuery() {
  return useQuery({
    queryKey: queryKeys.market.snapshot(),
    queryFn: () => marketApi.getMarketSnapshot(),
    refetchInterval: REFRESH_INTERVAL_MS,
    refetchOnWindowFocus: true,
  });
}
