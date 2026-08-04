import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthContextForPage, hasRole } from "@/server/auth/guard";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAuthContextForPage(await cookies());
  if (!ctx) redirect("/login");
  if (!hasRole(ctx.user.role, ["admin"])) redirect("/");

  return (
    <div className="min-h-screen bg-bg-subtle">
      <header className="border-b border-border bg-navy-900">
        <div className="mx-auto flex max-w-layout items-center gap-6 px-6 py-3">
          <Link href="/" className="text-lg font-bold text-white">
            SB News AI
          </Link>
          <span className="rounded-sm bg-blue-600 px-2 py-0.5 text-xs font-medium text-white">관리자</span>
          <nav className="flex gap-4 text-sm text-blue-100">
            <Link href="/admin/sources" className="hover:text-white">
              출처 관리
            </Link>
            <Link href="/admin/logs" className="hover:text-white">
              로그
            </Link>
          </nav>
          <Link href="/" className="ml-auto text-sm text-blue-100 hover:text-white">
            ← 일반 화면으로
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-layout px-6 py-8">{children}</main>
    </div>
  );
}
