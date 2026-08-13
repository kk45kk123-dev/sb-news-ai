"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as adminApi from "@/lib/api/admin";
import * as briefingApi from "@/lib/api/briefing";
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

export function useRegenerateBriefingMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => briefingApi.regenerateBriefing(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.briefing.today() }),
  });
}

export function useSettingsQuery() {
  return useQuery({
    queryKey: queryKeys.admin.settings(),
    queryFn: () => adminApi.getSettings(),
  });
}

export function useUpdateSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: Parameters<typeof adminApi.updateSettings>[0]) => adminApi.updateSettings(patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.admin.settings() }),
  });
}

export function useNotificationsQuery() {
  return useQuery({
    queryKey: queryKeys.admin.notifications(),
    queryFn: () => adminApi.getNotifications(),
    refetchInterval: 60_000, // 별도 push 인프라가 없어 1분 폴링으로 "실시간에 가깝게" 반영
  });
}

export function useMarkAllNotificationsReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => adminApi.markAllNotificationsRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.admin.notifications() }),
  });
}

export function useUpdateOrgUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; patch: adminApi.UpdateUserPatch }) => adminApi.updateOrgUser(vars.id, vars.patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}
