"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as adminApi from "@/lib/api/admin";
import { queryKeys } from "@/lib/query/keys";
import type { NewsListParams } from "@/lib/schemas/news.schema";

export function useAdminNewsListQuery(params: Partial<NewsListParams> = {}) {
  return useQuery({
    queryKey: queryKeys.admin.newsList(params),
    queryFn: () => adminApi.getAdminNewsList(params),
  });
}

export function useDashboardStatsQuery() {
  return useQuery({
    queryKey: queryKeys.admin.dashboard(),
    queryFn: () => adminApi.getDashboardStats(),
  });
}

function invalidateNewsEverywhere(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["news"] });
  queryClient.invalidateQueries({ queryKey: ["admin", "news"] });
  queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
  queryClient.invalidateQueries({ queryKey: ["categories"] });
}

export function useUpdateNewsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; patch: Parameters<typeof adminApi.updateNews>[1] }) =>
      adminApi.updateNews(vars.id, vars.patch),
    onSuccess: () => invalidateNewsEverywhere(queryClient),
  });
}

export function useDeleteNewsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.deleteNews(id),
    onSuccess: () => invalidateNewsEverywhere(queryClient),
  });
}

export function useCommitIngestMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (article: Parameters<typeof adminApi.commitIngestedArticle>[0]) =>
      adminApi.commitIngestedArticle(article),
    onSuccess: () => invalidateNewsEverywhere(queryClient),
  });
}
