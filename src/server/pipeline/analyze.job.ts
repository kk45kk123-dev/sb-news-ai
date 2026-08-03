import { runAnalysisForArticle } from "@/server/services/analysis.service";
import type { AnalyzeJobData } from "./queues";

export async function runAnalyzeJob(data: AnalyzeJobData): Promise<void> {
  await runAnalysisForArticle(data.articleId);
}
