"use client";

import { useQuery } from "@tanstack/react-query";
import * as briefingApi from "@/lib/api/briefing";
import { queryKeys } from "@/lib/query/keys";

export function useTodayBriefingQuery() {
  return useQuery({
    queryKey: queryKeys.briefing.today(),
    queryFn: () => briefingApi.getTodayBriefing(),
  });
}
