import { getOrgSettingsRaw, updateOrgSettingsRaw } from "@/server/repositories/organization.repository";
import { orgSettingsSchema, type OrgSettings, type OrgSettingsPatch } from "@/lib/schemas/settings.schema";

/** Missing/unknown keys fall back to schema defaults — safe against older rows saved before a field existed. */
export async function getOrgSettings(orgId: string): Promise<OrgSettings> {
  const raw = await getOrgSettingsRaw(orgId);
  const parsed = orgSettingsSchema.safeParse(raw);
  return parsed.success ? parsed.data : orgSettingsSchema.parse({});
}

export async function updateOrgSettings(orgId: string, patch: OrgSettingsPatch): Promise<OrgSettings> {
  const current = await getOrgSettings(orgId);
  const merged = orgSettingsSchema.parse({ ...current, ...patch });
  await updateOrgSettingsRaw(orgId, merged);
  return merged;
}
