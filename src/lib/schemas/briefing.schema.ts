import { z } from "zod";

export const briefingItemSchema = z.object({
  articleId: z.string(),
  whyNow: z.string(),
  soWhat: z.string(),
  title: z.string().nullable(),
  url: z.string().nullable(),
  sbImpactScore: z.number().nullable(),
});
export type BriefingItem = z.infer<typeof briefingItemSchema>;

export const briefingSchema = z.object({
  briefingDate: z.string(),
  overview: z.string(),
  items: z.array(briefingItemSchema),
  followUps: z.array(z.string()),
  generatedAt: z.string(),
  generatedBy: z.string(),
});
export type Briefing = z.infer<typeof briefingSchema>;
