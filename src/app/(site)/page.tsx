import { QueryClient, dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { DEFAULT_ORG_ID } from "@/config/constants";
import { listPublicNews, publicNewsListQuerySchema } from "@/server/services/article.service";
import { getMarketSnapshot } from "@/server/services/market.service";
import { queryKeys } from "@/lib/query/keys";
import { HomeContent } from "./home-content";

// 이전엔 이 페이지 전체가 "use client"라 접속 시 빈 화면 → JS 로드 → 그제서야
// featured/latest 뉴스·시장 스냅샷 요청이 시작되는 워터폴이 있었다. 서버에서
// 미리 fetch해 HydrationBoundary로 내려주면 첫 응답에 데이터가 이미 포함돼
// 클라이언트는 캐시를 읽기만 하고, 추가 상호작용(새로고침 등)은 평소처럼
// TanStack Query가 처리한다. 개인화가 없는 공개 데이터라 서버에서 안전하게
// 미리 가져올 수 있다 — 로그인 필요한 "오늘의 브리핑"은 이번 범위에서 제외
// (TodayBriefing이 이미 비로그인/미생성 시 조용히 숨는 구조라 별도 처리 없이도
// 정상 동작하며, 서버 프리페치를 위해 인증 로직을 페이지에 복제하지 않는다).
const FEATURED_PARAMS = { sort: "impact" as const, pageSize: 1 };
const LATEST_PARAMS = { sort: "latest" as const, pageSize: 6 };

// 이 페이지는 쿠키/헤더를 읽지 않아 Next.js가 빌드 시점에 정적으로 미리
// 렌더링할 수 있다고 판단한다 — 그러면 배포 이후 새로 게시된 기사가 반영되지
// 않고 빌드 시점 데이터가 계속 보이게 된다. 뉴스 사이트에 맞지 않는 동작이라
// 매 요청마다 서버에서 새로 렌더링하도록 명시한다.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const queryClient = new QueryClient();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: queryKeys.news.list(FEATURED_PARAMS),
      queryFn: () => listPublicNews(DEFAULT_ORG_ID, publicNewsListQuerySchema.parse(FEATURED_PARAMS)),
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.news.list(LATEST_PARAMS),
      queryFn: () => listPublicNews(DEFAULT_ORG_ID, publicNewsListQuerySchema.parse(LATEST_PARAMS)),
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.market.snapshot(),
      queryFn: () => getMarketSnapshot(),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <HomeContent />
    </HydrationBoundary>
  );
}
