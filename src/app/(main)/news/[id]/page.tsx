import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getAuthContextForPage } from "@/server/auth/guard";
import { getArticleDetail } from "@/server/services/article.service";
import { AnalysisPanel } from "@/components/news/AnalysisPanel";
import { CategoryChip } from "@/components/ui/CategoryChip";
import { formatRelativeTime } from "@/lib/date";

export default async function NewsDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContextForPage(await cookies());
  if (!ctx) redirect("/login");

  const { id } = await params;
  const article = await getArticleDetail(id);
  if (!article) notFound();

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-text-subtle">
          {article.categories.map((c) => (
            <CategoryChip key={c.slug} label={c.name} />
          ))}
          <span>{article.source.name}</span>
          <span>{formatRelativeTime(new Date(article.publishedAt))}</span>
        </div>

        <h1 className="mb-3 text-xl font-bold text-navy-900">{article.title}</h1>

        <div className="mb-4 flex gap-3">
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-border-strong px-3 py-1.5 text-sm text-text hover:bg-bg-subtle"
          >
            원문 보기 ↗
          </a>
          <Link href="/news" className="rounded-md px-3 py-1.5 text-sm text-text-muted hover:bg-bg-subtle">
            목록으로
          </Link>
        </div>

        {article.analysis ? (
          <div className="space-y-4">
            <section>
              <h2 className="mb-2 text-sm font-semibold text-text-subtle">📄 3줄 요약</h2>
              <ul className="space-y-1 text-sm leading-relaxed text-text">
                {article.analysis.summaryLines.map((line, i) => (
                  <li key={i}>{i + 1}. {line}</li>
                ))}
              </ul>
            </section>

            {article.analysis.aiComment && (
              <section className="rounded-lg bg-bg-ai p-3">
                <h2 className="mb-1 text-sm font-semibold text-text-subtle">🤖 AI 한줄 의견</h2>
                <p className="text-sm text-text">&ldquo;{article.analysis.aiComment}&rdquo;</p>
              </section>
            )}
          </div>
        ) : (
          <p className="text-sm text-text-muted">
            아직 AI 분석이 없습니다. 파이프라인이 처리 중이거나 분석에 실패했을 수 있습니다 — 원문 링크로 확인해 주세요.
          </p>
        )}

        {article.description && (
          <p className="mt-4 text-sm text-text-muted">{article.description}</p>
        )}
      </div>

      <aside>
        <AnalysisPanel article={article} />
      </aside>
    </div>
  );
}
