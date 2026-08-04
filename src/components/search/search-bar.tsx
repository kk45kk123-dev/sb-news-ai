"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, X, Clock, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { useRecentSearches } from "@/hooks/use-recent-searches";
import { useAutocompleteQuery } from "@/lib/query/use-search";
import { POPULAR_SEARCHES } from "@/lib/api/search";

interface SearchBarProps {
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
  onNavigate?: () => void;
}

export function SearchBar({ className, placeholder = "키워드, 종목, 규제명으로 검색", autoFocus, onNavigate }: SearchBarProps) {
  const router = useRouter();
  const [value, setValue] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const debounced = useDebounce(value, 200);
  const { recent, addRecent, removeRecent } = useRecentSearches();
  const { data: suggestions } = useAutocompleteQuery(debounced);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function go(query: string) {
    const trimmed = query.trim();
    if (!trimmed) return;
    addRecent(trimmed);
    setOpen(false);
    onNavigate?.();
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  const showPanel = open && (value.trim().length > 0 || recent.length > 0);

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <div className="flex items-center gap-2 rounded-full border border-input bg-background px-3.5 py-2 transition-colors focus-within:ring-2 focus-within:ring-ring">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") go(value);
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {value && (
          <button type="button" onClick={() => setValue("")} className="shrink-0 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {showPanel && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-xl border border-border bg-popover shadow-popover animate-in fade-in-0 zoom-in-95">
          {value.trim() ? (
            <div className="max-h-80 overflow-y-auto p-2">
              {suggestions && suggestions.length > 0 ? (
                suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => go(s)}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
                  >
                    <Search className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{s}</span>
                  </button>
                ))
              ) : (
                <p className="px-3 py-4 text-center text-sm text-muted-foreground">엔터를 눌러 &ldquo;{value}&rdquo; 검색</p>
              )}
            </div>
          ) : (
            <div className="p-3">
              {recent.length > 0 && (
                <div className="mb-3">
                  <p className="mb-1.5 flex items-center gap-1 px-1 text-xs font-semibold text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" /> 최근 검색어
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {recent.map((q) => (
                      <span
                        key={q}
                        className="group flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground"
                      >
                        <button onClick={() => go(q)}>{q}</button>
                        <button onClick={() => removeRecent(q)} className="text-muted-foreground hover:text-foreground">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="mb-1.5 flex items-center gap-1 px-1 text-xs font-semibold text-muted-foreground">
                  <TrendingUp className="h-3.5 w-3.5" /> 인기 검색어
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_SEARCHES.map((q, i) => (
                    <button
                      key={q}
                      onClick={() => go(q)}
                      className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted/70"
                    >
                      <span className="text-accent">{i + 1}</span>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
