import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthContextForPage } from "@/server/auth/guard";
import { getDashboardStats } from "@/server/services/dashboard.service";
import { getBriefingForDate } from "@/server/services/briefing.service";
import { StatCard } from "@/components/ui/StatCard";
import { BriefingCard } from "@/components/briefing/BriefingCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatRelativeTime } from "@/lib/date";

export default async function DashboardPage() {
  const ctx = await getAuthContextForPage(await cookies());
  if (!ctx) redirect("/login");

  const [stats, briefing] = await Promise.all([
    getDashboardStats(ctx.user.orgId, ctx.user.id),
    getBriefingForDate(ctx.user.orgId, new Date()),
  ]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-navy-900">대시보드</h1>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="오늘 수집" value={stats.todayCollectedCount} />
        <StatCard label="고영향" value={stats.highImpactCount} />
        <StatCard label="안 읽음" value={stats.unreadCount} />
        <StatCard
          label="마지막 수집"
          value={stats.lastCollectedAt ? formatRelativeTime(new Date(stats.lastCollectedAt)) : "-"}
        />
      </div>

      <section className="rounded-lg border border-border bg-bg p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-navy-900">📌 오늘의 브리핑</h2>
          <Link href="/briefing" className="text-sm text-blue-600 hover:underline">
            전체 브리핑 →
          </Link>
        </div>

        {!briefing ? (
          <EmptyState
            title="오늘 수집된 뉴스가 없습니다"
            description="AI 분석이 완료되면 브리핑이 자동으로 생성됩니다."
          />
        ) : (
          <>
            <p className="mb-3 text-sm text-text-muted">{briefing.overview}</p>
            {briefing.items.slice(0, 5).map((item, i) => (
              <BriefingCard key={item.articleId} item={item} rank={i + 1} />
            ))}
          </>
        )}
      </section>
    </div>
  );
}
