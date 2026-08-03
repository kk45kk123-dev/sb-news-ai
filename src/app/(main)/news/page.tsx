import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthContextForPage } from "@/server/auth/guard";
import { listArticlesQuerySchema, listArticlesForOrg } from "@/server/services/article.service";
import { listActiveCategories } from "@/server/repositories/category.repository";
import { NewsCard } from "@/components/news/NewsCard";
import { FilterBar } from "@/components/news/FilterBar";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function NewsListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await getAuthContextForPage(await cookies());
  if (!ctx) redirect("/login");

  const rawParams = await searchParams;
  const normalized = Object.fromEntries(
    Object.entries(rawParams).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])
  );
  const parsed = listArticlesQuerySchema.safeParse(normalized);
  const query = parsed.success ? parsed.data : listArticlesQuerySchema.parse({});

  const [{ items, total }, categories] = await Promise.all([
    listArticlesForOrg(ctx.user.orgId, query, ctx.user.id),
    listActiveCategories(ctx.user.orgId),
  ]);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-navy-900">뉴스</h1>
      <FilterBar categories={categories} />

      {items.length === 0 ? (
        <EmptyState
          title="조건에 맞는 뉴스가 없습니다"
          description="필터를 조정하거나 기간을 넓혀보세요. 연휴 등으로 수집된 뉴스가 없는 날일 수도 있습니다."
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
