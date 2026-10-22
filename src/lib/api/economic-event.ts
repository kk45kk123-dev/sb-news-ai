import { apiFetch } from "@/lib/api/http";
import {
  economicEventListSchema,
  adminEconomicEventSchema,
  adminEconomicEventListSchema,
  type EconomicEventDto,
  type AdminEconomicEvent,
  type CreateEconomicEventInput,
  type UpdateEconomicEventInput,
} from "@/lib/schemas/economic-event.schema";

export async function getUpcomingEconomicEvents(): Promise<EconomicEventDto[]> {
  const data = await apiFetch<unknown>("/api/v1/economic-events");
  return economicEventListSchema.parse(data);
}

export async function getAdminEconomicEvents(): Promise<AdminEconomicEvent[]> {
  const data = await apiFetch<unknown>("/api/v1/admin/economic-events");
  return adminEconomicEventListSchema.parse(data);
}

export async function createEconomicEvent(input: CreateEconomicEventInput): Promise<AdminEconomicEvent> {
  const data = await apiFetch<unknown>("/api/v1/admin/economic-events", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return adminEconomicEventSchema.parse(data);
}

export async function updateEconomicEvent(id: string, patch: UpdateEconomicEventInput): Promise<AdminEconomicEvent> {
  const data = await apiFetch<unknown>(`/api/v1/admin/economic-events/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  return adminEconomicEventSchema.parse(data);
}

export async function deleteEconomicEvent(id: string): Promise<void> {
  await apiFetch(`/api/v1/admin/economic-events/${id}`, { method: "DELETE" });
}
