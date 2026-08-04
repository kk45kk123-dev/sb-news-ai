"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

const SORT_OPTIONS = [
  { value: "impact", label: "영향도순" },
  { value: "recent", label: "최신순" },
  { value: "importance", label: "중요도순" },
];

export function FilterBar({ categories }: { categories: { name: string; slug: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("cursor"); // 필터가 바뀌면 첫 페이지로
    router.push(`${pathname}?${params.toString()}`);
  }

  function reset() {
    router.push(pathname);
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-bg p-3">
      <select
        className="rounded-md border border-border-strong px-2 py-1.5 text-sm"
        value={searchParams.get("categories") ?? ""}
        onChange={(e) => setParam("categories", e.target.value)}
      >
        <option value="">전체 카테고리</option>
        {categories.map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.name}
          </option>
        ))}
      </select>

      <select
        className="rounded-md border border-border-strong px-2 py-1.5 text-sm"
        value={searchParams.get("min_impact") ?? ""}
        onChange={(e) => setParam("min_impact", e.target.value)}
      >
        <option value="">전체 영향도</option>
        {[5, 4, 3, 2, 1].map((n) => (
          <option key={n} value={n}>
            {n}점 이상
          </option>
        ))}
      </select>

      <select
        className="rounded-md border border-border-strong px-2 py-1.5 text-sm"
        value={searchParams.get("sort") ?? "impact"}
        onChange={(e) => setParam("sort", e.target.value)}
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <label className="flex items-center gap-1.5 text-sm text-text-muted">
        <input
          type="checkbox"
          checked={searchParams.get("unread_only") === "true"}
          onChange={(e) => setParam("unread_only", e.target.checked ? "true" : "")}
        />
        읽지 않음
      </label>

      <label className="flex items-center gap-1.5 text-sm text-text-muted">
        <input
          type="checkbox"
          checked={searchParams.get("bookmarked_only") === "true"}
          onChange={(e) => setParam("bookmarked_only", e.target.checked ? "true" : "")}
        />
        저장한 뉴스
      </label>

      <button
        type="button"
        onClick={reset}
        className="ml-auto rounded-md px-3 py-1.5 text-sm text-text-muted hover:bg-bg-subtle"
      >
        초기화
      </button>
    </div>
  );
}
