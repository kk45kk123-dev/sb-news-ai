import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthContextForPage } from "@/server/auth/guard";
import { listArticlesQuerySchema, listArticlesForOrg } from "@/server/services/article.service";
import { NewsCard } from "@/components/news/NewsCard";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function SavedPage() {
  const ctx = await getAuthContextForPage(await cookies());
  if (!ctx) redirect("/login");

  const query = listArticlesQuerySchema.parse({
    bookmarked_only: true,
    sort: "recent",
    date_from: new Date(0).toISOString(), // 즐겨찾기는 저장 시점이 중요 — 기간 제한 없이 전체 조회
  });
  const { items, total } = await listArticlesForOrg(ctx.user.orgId, query, ctx.user.id);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-navy-900">즐겨찾기</h1>

      {items.length === 0 ? (
        <EmptyState
          title="저장한 뉴스가 없습니다"
          description="뉴스 목록이나 상세 화면에서 ☆ 버튼을 눌러 저장해보세요."
        />
      ) : (
        <>
          <p className="mb-3 text-sm text-text-muted">총 {total}건</p>
          <div className="space-y-3">
            {items.map((article) => (
              <NewsCard key={article.id} article={article} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
