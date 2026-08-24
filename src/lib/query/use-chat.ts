"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as chatApi from "@/lib/api/chat";
import { queryKeys } from "@/lib/query/keys";
import type { AskQuestionInput } from "@/lib/schemas/chat.schema";

export function useChatSessionsQuery(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.chat.sessions(),
    queryFn: chatApi.getChatSessions,
    enabled,
  });
}

export function useChatSessionDetailQuery(id: string | null) {
  return useQuery({
    queryKey: queryKeys.chat.session(id ?? ""),
    queryFn: () => chatApi.getChatSessionDetail(id!),
    enabled: !!id,
  });
}

export function useAskQuestionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AskQuestionInput) => chatApi.askQuestion(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.sessions() });
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.session(data.sessionId) });
    },
  });
}
