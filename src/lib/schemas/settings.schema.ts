import { z } from "zod";

export const orgSettingsSchema = z.object({
  siteName: z.string().min(1).max(100).default("SB NEWS AI"),
  /** 관리자 "기사 등록" 화면에서 검수를 마친 기사를 즉시 게시할지, 임시저장(초안)으로 남길지. */
  autoPublish: z.boolean().default(true),
  duplicateCheck: z.boolean().default(true),
  emailAlerts: z.boolean().default(false),
  scrapAlerts: z.boolean().default(true),
  /** categoryId (c1..c9) → custom display name, only for entries the admin has renamed. */
  categoryNames: z.record(z.string(), z.string().min(1).max(50)).default({}),
  /** 경제 일정(EconomicEvent)을 마지막으로 손본 시각(ISO) — daily pipeline이 2주 이상
   *  지났으면 관리자에게 알림으로 "업데이트할 때가 됐다"고 알려주는 기준이 된다. */
  economicCalendarRefreshedAt: z.string().datetime().nullable().default(null),
  /** 위 알림을 마지막으로 보낸 시각(ISO) — 같은 미갱신 기간 동안 매일 중복 알림을
   *  보내지 않기 위한 기준. */
  economicCalendarReminderSentAt: z.string().datetime().nullable().default(null),
});
export type OrgSettings = z.infer<typeof orgSettingsSchema>;

export const orgSettingsPatchSchema = orgSettingsSchema.partial();
export type OrgSettingsPatch = z.infer<typeof orgSettingsPatchSchema>;
