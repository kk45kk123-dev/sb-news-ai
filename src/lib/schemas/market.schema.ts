import { z } from "zod";

export const marketIndicatorSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
  change: z.number(),
  changeLabel: z.string(),
  trend: z.array(z.number()),
  isLive: z.boolean(),
});
export type MarketIndicator = z.infer<typeof marketIndicatorSchema>;

export const marketSnapshotSchema = z.object({
  items: z.array(marketIndicatorSchema),
  fetchedAt: z.string(),
});
export type MarketSnapshot = z.infer<typeof marketSnapshotSchema>;
