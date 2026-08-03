import Link from "next/link";
import type { BriefingDto } from "@/server/services/briefing.service";

export function BriefingCard({ item, rank }: { item: BriefingDto["items"][number]; rank: number }) {
  return (
    <div className="border-b border-border py-3 last:border-b-0">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy-900 text-xs font-bold text-white">
          {rank}
        </span>
        <div className="min-w-0 flex-1">
          {item.title && item.url ? (
            <Link href={`/news/${item.articleId}`} className="font-semibold text-text hover:underline">
              {item.title}
            </Link>
          ) : (
            <span className="font-semibold text-text-muted">(삭제되었거나 찾을 수 없는 기사)</span>
          )}
          {item.sbImpactScore && (
            <span className="ml-2 text-xs text-text-subtle">영향도 {item.sbImpactScore}/5</span>
          )}
          <p className="mt-1 text-sm text-text-muted">→ {item.whyNow}</p>
          <p className="text-sm text-navy-700">💡 {item.soWhat}</p>
        </div>
      </div>
    </div>
  );
}
