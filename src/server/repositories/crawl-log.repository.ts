import { prisma } from "@/server/db/client";

export async function recordCrawlLog(input: {
  sourceId: string;
  startedAt: Date;
  finishedAt: Date;
  status: "success" | "error" | "partial";
  itemsFound: number;
  itemsNew: number;
  errorMessage?: string;
}): Promise<void> {
  await prisma.crawlLog.create({
    data: {
      sourceId: input.sourceId,
      startedAt: input.startedAt,
      finishedAt: input.finishedAt,
      status: input.status,
      itemsFound: input.itemsFound,
      itemsNew: input.itemsNew,
      errorMessage: input.errorMessage,
    },
  });
}
