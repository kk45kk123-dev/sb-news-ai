import Link from "next/link";
import { Compass, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-muted">
        <Compass className="h-9 w-9 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <div className="space-y-2">
        <h1 className="text-page-title">페이지를 찾을 수 없습니다</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          주소가 변경되었거나 삭제된 페이지일 수 있습니다. 홈으로 돌아가 다시 찾아보세요.
        </p>
      </div>
      <Button asChild>
        <Link href="/">
          <Home className="h-4 w-4" /> 홈으로 이동
        </Link>
      </Button>
    </div>
  );
}
