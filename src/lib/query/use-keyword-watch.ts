"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as watchApi from "@/lib/api/keyword-watch";
import { queryKeys } from "@/lib/query/keys";
import type { CreateWatchInput } from "@/lib/schemas/keyword-watch.schema";

export function useMyWatchesQuery(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.keywordWatches.mine(),
    queryFn: watchApi.getMyWatches,
    enabled,
  });
}

export function useCreateWatchMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateWatchInput) => watchApi.createWatch(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.keywordWatches.mine() }),
  });
}

export function useDeleteWatchMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => watchApi.deleteWatch(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.keywordWatches.mine() }),
  });
}
