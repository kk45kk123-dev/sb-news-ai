"use client";

import { useState } from "react";
import { getCsrfToken } from "@/lib/csrf-client";

export function BookmarkButton({ articleId, initialBookmarked }: { articleId: string; initialBookmarked: boolean }) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [pending, setPending] = useState(false);

  async function toggle() {
    const next = !bookmarked;
    setBookmarked(next); // 낙관적 업데이트 (§12.3)
    setPending(true);

    const res = await fetch(`/api/v1/articles/${articleId}/bookmark`, {
      method: "PUT",
      headers: { "content-type": "application/json", "x-csrf-token": getCsrfToken() ?? "" },
      body: JSON.stringify({ bookmarked: next }),
    });

    setPending(false);
    if (!res.ok) {
      setBookmarked(!next); // 실패 시 롤백
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={bookmarked}
      aria-label={bookmarked ? "즐겨찾기 해제" : "즐겨찾기 추가"}
      className={`rounded-md border px-3 py-1.5 text-sm transition ${
        bookmarked
          ? "border-blue-600 bg-blue-100 text-blue-600"
          : "border-border-strong text-text hover:bg-bg-subtle"
      }`}
    >
      {bookmarked ? "★ 저장됨" : "☆ 저장"}
    </button>
  );
}
