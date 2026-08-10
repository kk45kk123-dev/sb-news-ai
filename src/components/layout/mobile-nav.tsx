"use client";

import * as React from "react";
import Link from "next/link";
import { Bookmark, History, Menu, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { useCategories } from "@/context/categories-context";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { SearchBar } from "@/components/search/search-bar";
import { useAuth } from "@/context/auth-context";

export function MobileNav() {
  const [open, setOpen] = React.useState(false);
  const { user } = useAuth();
  const categories = useCategories();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="shrink-0 lg:hidden" aria-label="메뉴 열기">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex w-80 flex-col gap-6">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-secondary text-white">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            SB NEWS AI
          </SheetTitle>
        </SheetHeader>

        <SearchBar onNavigate={() => setOpen(false)} />

        <nav className="flex flex-col gap-1 overflow-y-auto">
          <SheetClose asChild>
            <Link href="/news?sort=views" className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted">
              <TrendingUp className="h-4 w-4 text-muted-foreground" /> 인기뉴스
            </Link>
          </SheetClose>
          <SheetClose asChild>
            <Link href="/bookmarks" className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted">
              <Bookmark className="h-4 w-4 text-muted-foreground" /> 북마크
            </Link>
          </SheetClose>
          <SheetClose asChild>
            <Link href="/recent" className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted">
              <History className="h-4 w-4 text-muted-foreground" /> 최근 본 기사
            </Link>
          </SheetClose>

          <p className="mt-3 px-3 text-xs font-semibold text-muted-foreground">카테고리</p>
          {categories.map((c) => (
            <SheetClose asChild key={c.id}>
              <Link href={`/news?category=${c.id}`} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: `hsl(var(--${c.colorVar}))` }} />
                {c.name}
              </Link>
            </SheetClose>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-2 border-t border-border pt-4">
          <SheetClose asChild>
            <Link href="/admin/login" className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted">
              <ShieldCheck className="h-4 w-4" /> 관리자 로그인
            </Link>
          </SheetClose>
          {!user && (
            <div className="flex gap-2 px-3">
              <Button asChild variant="outline" className="flex-1" size="sm">
                <Link href="/login" onClick={() => setOpen(false)}>로그인</Link>
              </Button>
              <Button asChild className="flex-1" size="sm">
                <Link href="/signup" onClick={() => setOpen(false)}>회원가입</Link>
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
