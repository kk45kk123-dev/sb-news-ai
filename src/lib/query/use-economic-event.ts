"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as eventApi from "@/lib/api/economic-event";
import { queryKeys } from "@/lib/query/keys";
import type { CreateEconomicEventInput, UpdateEconomicEventInput } from "@/lib/schemas/economic-event.schema";

export function useUpcomingEconomicEventsQuery() {
  return useQuery({
    queryKey: queryKeys.economicEvents.upcoming(),
    queryFn: eventApi.getUpcomingEconomicEvents,
  });
}

export function useAdminEconomicEventsQuery() {
  return useQuery({
    queryKey: queryKeys.economicEvents.adminAll(),
    queryFn: eventApi.getAdminEconomicEvents,
  });
}

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: queryKeys.economicEvents.adminAll() });
  queryClient.invalidateQueries({ queryKey: queryKeys.economicEvents.upcoming() });
}

export function useCreateEconomicEventMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEconomicEventInput) => eventApi.createEconomicEvent(input),
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function useUpdateEconomicEventMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateEconomicEventInput }) =>
      eventApi.updateEconomicEvent(id, patch),
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function useDeleteEconomicEventMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => eventApi.deleteEconomicEvent(id),
    onSuccess: () => invalidateAll(queryClient),
  });
}
