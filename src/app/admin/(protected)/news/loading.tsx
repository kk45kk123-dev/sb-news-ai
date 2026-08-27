import { Skeleton } from "@/components/ui/skeleton";

/** admin/news/page.tsx가 세션 확인(Redis) + 목록 조회를 마칠 때까지 서버에서
 *  기다리는 구간을 즉시 감싼다 — 관리자가 "뉴스 관리" 메뉴를 클릭했을 때 응답이
 *  없는 것처럼 보이지 않도록 표 모양 스켈레톤을 바로 보여준다. */
export default function AdminNewsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
      <Skeleton className="h-10 w-full max-w-md rounded-lg" />
      <div className="space-y-3 rounded-xl border border-border p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}
