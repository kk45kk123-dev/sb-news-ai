"use client";

import { useQuery } from "@tanstack/react-query";
import * as searchApi from "@/lib/api/search";
import { queryKeys } from "@/lib/query/keys";
import type { NewsListParams } from "@/lib/schemas/news.schema";

export function useSearchQuery(params: Partial<NewsListParams>) {
  return useQuery({
    queryKey: queryKeys.search.results(params),
    queryFn: () => searchApi.searchNews(params),
    enabled: !!params.query && params.query.trim().length > 0,
  });
}

export function useAutocompleteQuery(query: string) {
  return useQuery({
    queryKey: queryKeys.search.suggestions(query),
    queryFn: () => searchApi.getAutocompleteSuggestions(query),
    enabled: query.trim().length > 0,
  });
}
