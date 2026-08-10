import { apiFetch, ApiRequestError } from "@/lib/api/http";
import { briefingSchema, type Briefing } from "@/lib/schemas/briefing.schema";

/** Anonymous visitors (no session) get 401 here — treated as "no briefing to show", not an error. */
export async function getTodayBriefing(): Promise<Briefing | null> {
  try {
    const data = await apiFetch<unknown>("/api/v1/briefings/today");
    return data ? briefingSchema.parse(data) : null;
  } catch (e) {
    if (e instanceof ApiRequestError && e.status === 401) return null;
    throw e;
  }
}

/** Admin-only — the route itself re-checks the role, this just lets 403s surface as a normal error. */
export async function regenerateBriefing(): Promise<Briefing> {
  const data = await apiFetch<unknown>("/api/v1/admin/briefings/regenerate", { method: "POST" });
  return briefingSchema.parse(data);
}
