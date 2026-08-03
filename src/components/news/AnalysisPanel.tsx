import type { ArticleDto } from "@/server/services/article.service";
import { ImpactMeter } from "@/components/ui/ImpactMeter";
import { ConfidenceBadge } from "@/components/ui/ConfidenceBadge";
import { AIDisclaimer } from "@/components/ui/AIDisclaimer";
import { EvidenceQuote } from "./EvidenceQuote";

export function AnalysisPanel({ article }: { article: ArticleDto }) {
  const analysis = article.analysis;
  if (!analysis) {
    return (
      <div className="rounded-lg border border-border bg-bg-subtle p-4 text-sm text-text-muted">
        아직 AI 분석이 완료되지 않았거나 분석에 실패했습니다. 원문 링크로 직접 확인해 주세요.
      </div>
    );
  }

  const evidence = Array.isArray(analysis.evidence) ? (analysis.evidence as string[]) : [];

  return (
    <div className="space-y-4 rounded-lg bg-bg-ai p-4">
      <div>
        <p className="mb-1 text-xs font-medium text-text-subtle">저축은행 영향도</p>
        <ImpactMeter score={analysis.sbImpactScore} direction={analysis.sbImpactDirection} />
      </div>

      <div>
        <p className="mb-1 text-xs font-medium text-text-subtle">영향 판단 근거</p>
        <p className="text-sm text-text">{analysis.sbImpactReason}</p>
      </div>

      {analysis.customerImpact && (
        <div>
          <p className="mb-1 text-xs font-medium text-text-subtle">고객 영향</p>
          <p className="text-sm text-text">{analysis.customerImpact}</p>
        </div>
      )}

      {analysis.digitalImpact && (
        <div>
          <p className="mb-1 text-xs font-medium text-text-subtle">디지털전략 영향</p>
          <p className="text-sm text-text">{analysis.digitalImpact}</p>
        </div>
      )}

      {analysis.risks.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium text-text-subtle">⚠️ 예상 리스크</p>
          <ul className="list-inside list-disc text-sm text-text">
            {analysis.risks.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      {analysis.actionIdeas.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium text-text-subtle">💡 대응 아이디어</p>
          <ul className="list-inside list-disc text-sm text-text">
            {analysis.actionIdeas.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
      )}

      <EvidenceQuote quotes={evidence} sourceUrl={article.url} />

      <div className="flex items-center justify-between border-t border-border-strong pt-3">
        <ConfidenceBadge level={analysis.confidence} />
      </div>

      <AIDisclaimer sourceUrl={article.url} />
    </div>
  );
}
