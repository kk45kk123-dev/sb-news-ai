import { Skeleton } from "@/components/ui/skeleton";
import { NewsGrid } from "@/components/news/news-grid";

/**
 * (site) 아래 페이지 대부분(홈 포함)이 자기만의 loading.tsx를 갖고 있지 않으므로
 * 여기가 사실상 공개 사이트 전체의 공용 로딩 화면이다 — 서버 컴포넌트(예: 홈의
 * page.tsx)가 뉴스 목록·시장 스냅샷을 fetch하는 동안 즉시 이 스켈레톤을 보여줘서,
 * 클릭했는데 화면이 멈춘 것처럼 보이는 문제를 없앤다. 홈 화면 레이아웃을 대략
 * 흉내 낸 모양이라 다른 페이지에서는 정확히 들어맞지 않지만, "뭔가 로딩 중"이라는
 * 신호를 즉시 주는 게 목적이라 페이지마다 전용 스켈레톤을 만드는 것보다 낫다.
 */
export default function SiteLoading() {
  return (
    <div className="container space-y-10 py-8">
      <section>
        <Skeleton className="aspect-[16/9] w-full rounded-2xl sm:aspect-[2/1]" />
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      </section>
      <section>
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-4 w-16" />
        </div>
        <NewsGrid isLoading skeletonCount={6} />
      </section>
    </div>
  );
}
