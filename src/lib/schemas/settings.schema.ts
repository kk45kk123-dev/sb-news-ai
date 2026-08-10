import { z } from "zod";

export const orgSettingsSchema = z.object({
  siteName: z.string().min(1).max(100).default("SB NEWS AI"),
  /** 관리자 "기사 등록" 화면에서 검수를 마친 기사를 즉시 게시할지, 임시저장(초안)으로 남길지. */
  autoPublish: z.boolean().default(true),
  duplicateCheck: z.boolean().default(true),
  emailAlerts: z.boolean().default(false),
  scrapAlerts: z.boolean().default(true),
});
export type OrgSettings = z.infer<typeof orgSettingsSchema>;

export const orgSettingsPatchSchema = orgSettingsSchema.partial();
export type OrgSettingsPatch = z.infer<typeof orgSettingsPatchSchema>;
