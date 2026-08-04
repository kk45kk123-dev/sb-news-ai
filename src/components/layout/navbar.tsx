"use client";

import Link from "next/link";
import { Bookmark, ChevronDown, Menu, Newspaper, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { CATEGORIES } from "@/data/categories";
import { SearchBar } from "@/components/search/search-bar";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border glass">
      <div className="container flex h-16 items-center gap-4">
        <MobileNav />

        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-secondary text-white shadow-soft">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="hidden text-lg font-extrabold tracking-tight text-foreground sm:inline">SB NEWS AI</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
                <Newspaper className="h-4 w-4" /> 카테고리 <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              {CATEGORIES.map((c) => (
                <DropdownMenuItem key={c.id} asChild>
                  <Link href={`/news?category=${c.id}`}>
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: `hsl(var(--${c.colorVar}))` }} />
                    {c.name}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button asChild variant="ghost" size="sm" className="gap-1 text-muted-foreground">
            <Link href="/news?sort=views">
              <TrendingUp className="h-4 w-4" /> 인기뉴스
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="gap-1 text-muted-foreground">
            <Link href="/news?ai=1">
              <Sparkles className="h-4 w-4" /> AI 추천
            </Link>
          </Button>
        </nav>

        <div className="hidden flex-1 md:block md:max-w-xs lg:max-w-sm">
          <SearchBar className="text-sm" />
        </div>

        <div className="ml-auto flex items-center gap-1">
          <Button asChild variant="ghost" size="icon" className="rounded-full md:hidden" aria-label="검색">
            <Link href="/search">
              <Newspaper className="h-[18px] w-[18px]" />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="icon" className="rounded-full" aria-label="북마크">
            <Link href="/bookmarks">
              <Bookmark className="h-[18px] w-[18px]" />
            </Link>
          </Button>
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm" className="hidden gap-1 text-muted-foreground xl:inline-flex">
            <Link href="/admin/login">
              <ShieldCheck className="h-4 w-4" /> 관리자
            </Link>
          </Button>
          <span className="mx-1 hidden h-6 w-px bg-border sm:block" />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
