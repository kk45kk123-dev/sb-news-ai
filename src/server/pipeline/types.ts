// 파이프라인 단계 함수들의 입력 타입. BullMQ 제거 전에는 queues.ts의 Job 타입이었다 —
// 이제는 각 단계가 서로를 직접 호출하는 일반 함수이므로 큐와 무관한 순수 타입으로 옮겼다.

export interface CollectJobData {
  sourceId: string;
}
export interface NormalizeJobData {
  articleId: string;
}
export interface DedupeJobData {
  articleId: string;
}
export interface AnalyzeJobData {
  articleId: string;
}
