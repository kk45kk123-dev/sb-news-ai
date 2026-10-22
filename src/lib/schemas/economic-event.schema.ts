import { z } from "zod";

export const eventImportanceSchema = z.enum(["high", "medium", "low"]);
export type EventImportanceValue = z.infer<typeof eventImportanceSchema>;

/** 홈 화면 카드가 쓰는 표시용 모양 — 기존 src/data/market.ts의 EconomicEvent와 동일해서
 *  컴포넌트(economic-calendar.tsx)를 거의 그대로 재사용할 수 있다. */
export const economicEventDtoSchema = z.object({
  id: z.string(),
  date: z.string(),
  time: z.string(),
  title: z.string(),
  importance: eventImportanceSchema,
});
export type EconomicEventDto = z.infer<typeof economicEventDtoSchema>;
export const economicEventListSchema = z.array(economicEventDtoSchema);

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "YYYY-MM-DD 형식으로 입력해주세요." });

export const createEconomicEventSchema = z.object({
  title: z.string().min(2, { message: "2자 이상 입력해주세요." }).max(200),
  eventDate: isoDate,
  eventTime: z.string().max(20).optional().nullable(),
  importance: eventImportanceSchema,
});
export type CreateEconomicEventInput = z.infer<typeof createEconomicEventSchema>;

export const updateEconomicEventSchema = createEconomicEventSchema.partial();
export type UpdateEconomicEventInput = z.infer<typeof updateEconomicEventSchema>;

/** 관리자 화면용 — 날짜를 ISO 그대로 노출해 수정 폼에 바로 꽂을 수 있게 한다. */
export const adminEconomicEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  eventDate: z.string(),
  eventTime: z.string().nullable(),
  importance: eventImportanceSchema,
});
export type AdminEconomicEvent = z.infer<typeof adminEconomicEventSchema>;
export const adminEconomicEventListSchema = z.array(adminEconomicEventSchema);
