"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useCategories } from "@/context/categories-context";

export function Footer() {
  const categories = useCategories();

  return (
    <footer className="border-t border-border bg-card">
      <div className="container grid gap-10 py-12 md:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-secondary text-white">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <span className="text-base font-extrabold tracking-tight">SB NEWS AI</span>
          </Link>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
            저축은행 산업 종사자를 위한 AI 기반 경제뉴스 큐레이션·해석 플랫폼입니다. 모든 AI 분석은 참고용이며, 최종 의사결정 시 원문 확인이 필요합니다.
          </p>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold">카테고리</p>
          <ul className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
            {categories.map((c) => (
              <li key={c.id}>
                <Link href={`/news?category=${c.id}`} className="transition-colors hover:text-foreground">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold">서비스</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <Link href="/news?sort=views" className="transition-colors hover:text-foreground">인기뉴스</Link>
            </li>
            <li>
              <Link href="/admin/login" className="transition-colors hover:text-foreground">관리자 로그인</Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-5 text-center text-xs text-muted-foreground">
        © 2026 SB NEWS AI · 저축은행중앙회 디지털전략부 프로토타입
      </div>
    </footer>
  );
}
