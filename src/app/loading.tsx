import { Skeleton } from "@/components/ui/skeleton";

/**
 * 전역 안전망. src/app/(site)/layout.tsx가 매 최초 진입 시 getOrgSettings()를
 * 기다렸다가 화면을 그리는데, 이 서버 대기 구간을 즉시 감쌀 loading.tsx가 그동안
 * 어디에도 없어 "클릭 후 한참 무반응 → 갑자기 화면 전환"으로 느껴졌다. 더 구체적인
 * loading.tsx(예: (site)/loading.tsx)가 있는 경로는 그쪽이 우선 적용되고, 여기는
 * 그 어떤 segment도 자기 것을 정의하지 않은 경우의 최후 폴백이다.
 */
export default function RootLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}
