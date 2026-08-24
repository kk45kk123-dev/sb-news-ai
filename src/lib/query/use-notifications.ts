"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as notificationsApi from "@/lib/api/notifications";
import { queryKeys } from "@/lib/query/keys";

export function useMyNotificationsQuery(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.notifications.mine(),
    queryFn: notificationsApi.getNotifications,
    enabled,
    refetchInterval: enabled ? 60_000 : false, // 별도 push 인프라가 없어 1분 폴링 (관리자 알림벨과 동일한 원칙)
  });
}

export function useMarkAllMyNotificationsReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllNotificationsRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications.mine() }),
  });
}
