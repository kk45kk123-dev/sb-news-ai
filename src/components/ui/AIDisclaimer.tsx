/**
 * AI 생성 콘텐츠가 나오는 모든 곳에 예외 없이 배치한다 (§11.2, §20-2).
 * "원문 링크 없는 AI 요약은 표시하지 않는다"는 요구사항에 따라 원문 링크를 함께 받는다.
 */
export function AIDisclaimer({ sourceUrl }: { sourceUrl?: string }) {
  return (
    <p className="flex flex-wrap items-center gap-1 text-xs text-text-subtle">
      <span>AI가 생성한 분석입니다. 중요한 판단 전 원문을 확인하세요.</span>
      {sourceUrl && (
        <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
          원문 보기 ↗
        </a>
      )}
    </p>
  );
}
