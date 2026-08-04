import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthContextForPage } from "@/server/auth/guard";
import { getBriefingForDate } from "@/server/services/briefing.service";
import { BriefingCard } from "@/components/briefing/BriefingCard";
import { AIDisclaimer } from "@/components/ui/AIDisclaimer";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function BriefingPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const ctx = await getAuthContextForPage(await cookies());
  if (!ctx) redirect("/login");

  const { date } = await searchParams;
  const targetDate = date ? new Date(date) : new Date();
  const briefing = await getBriefingForDate(ctx.user.orgId, targetDate);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-bold text-navy-900">📌 오늘의 브리핑</h1>
      <p className="mb-4 text-sm text-text-muted">
        {targetDate.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}
      </p>

      {!briefing ? (
        <EmptyState
          title="아직 브리핑이 생성되지 않았습니다"
          description="분석이 완료된 뉴스가 쌓이면 자동으로 생성됩니다. 관리자는 /admin에서 수동으로 생성할 수 있습니다."
        />
      ) : (
        <div className="rounded-lg border border-border bg-bg p-5">
          <p className="mb-4 text-sm leading-relaxed text-text">{briefing.overview}</p>

          <div>
            {briefing.items.map((item, i) => (
              <BriefingCard key={item.articleId} item={item} rank={i + 1} />
            ))}
          </div>

          {briefing.followUps.length > 0 && (
            <div className="mt-4 border-t border-border pt-3">
              <p className="mb-1 text-xs font-medium text-text-subtle">주목할 후속 이슈</p>
              <ul className="list-inside list-disc text-sm text-text-muted">
                {briefing.followUps.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-4 border-t border-border pt-3">
            <AIDisclaimer />
          </div>
        </div>
      )}
    </div>
  );
}
