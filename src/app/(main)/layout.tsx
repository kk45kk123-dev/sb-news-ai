import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthContextForPage, hasRole } from "@/server/auth/guard";
import { LogoutButton } from "@/components/layout/LogoutButton";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAuthContextForPage(await cookies());
  if (!ctx) {
    redirect("/login");
  }

  const isAdmin = hasRole(ctx.user.role, ["admin"]);

  return (
    <div className="min-h-screen bg-bg-subtle">
      <header className="border-b border-border bg-bg">
        <div className="mx-auto flex max-w-layout items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-lg font-bold text-navy-900">
              SB News AI
            </Link>
            <nav className="flex gap-4 text-sm text-text-muted">
              <Link href="/" className="hover:text-text">
                대시보드
              </Link>
              <Link href="/briefing" className="hover:text-text">
                브리핑
              </Link>
              <Link href="/news" className="hover:text-text">
                뉴스
              </Link>
              <Link href="/saved" className="hover:text-text">
                저장
              </Link>
              {isAdmin && (
                <Link href="/admin/sources" className="hover:text-text">
                  관리자
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-text-muted">{ctx.user.name}님</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-layout px-6 py-8">{children}</main>
    </div>
  );
}
