import { cookies } from "next/headers";
import { QueryClient, dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getAuthContextForPage, hasRole } from "@/server/auth/guard";
import { listPublicNews, publicNewsListQuerySchema } from "@/server/services/article.service";
import { queryKeys } from "@/lib/query/keys";
import { AdminNewsListContent } from "./news-list-content";

// 이전엔 이 페이지 전체가 "use client"라 진입할 때마다 빈 화면 → JS 로드 →
// 그제서야 목록 요청이 시작됐다. 최초 페이지(page=1, 필터 없음)만 서버에서
// 미리 fetch해 HydrationBoundary로 내려준다 — 검색/필터/페이지 이동 같은
// 이후 상호작용은 여전히 클라이언트에서 평소대로 처리된다. 세션이 없거나
// admin이 아니면 그냥 프리페치를 건너뛰고 클라이언트 컴포넌트가 기존과
// 동일하게 자체적으로 요청해 401을 받도록 둔다(상위 레이아웃이 그 경우
// 로그인 화면으로 리다이렉트한다) — 이 페이지가 별도로 접근을 막지는 않는다.
const INITIAL_PARAMS = { page: 1, pageSize: 8 };

export default async function AdminNewsPage() {
  const queryClient = new QueryClient();
  const ctx = await getAuthContextForPage(await cookies());

  if (ctx && hasRole(ctx.user.role, ["admin"])) {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.admin.newsList(INITIAL_PARAMS),
      queryFn: () =>
        listPublicNews(ctx.user.orgId, publicNewsListQuerySchema.parse({ ...INITIAL_PARAMS, includeAllStatuses: true })),
    });
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AdminNewsListContent />
    </HydrationBoundary>
  );
}
