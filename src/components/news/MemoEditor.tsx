"use client";

import { useState } from "react";
import { getCsrfToken } from "@/lib/csrf-client";

export function MemoEditor({ articleId, initialMemo }: { articleId: string; initialMemo: string | null }) {
  const [memo, setMemo] = useState(initialMemo ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    const res = await fetch(`/api/v1/articles/${articleId}/memo`, {
      method: "PUT",
      headers: { "content-type": "application/json", "x-csrf-token": getCsrfToken() ?? "" },
      body: JSON.stringify({ memo }),
    });
    setSaving(false);
    if (res.ok) setSaved(true);
  }

  return (
    <div>
      <p className="mb-1 text-xs font-medium text-text-subtle">📝 개인 메모</p>
      <textarea
        value={memo}
        onChange={(e) => {
          setMemo(e.target.value);
          setSaved(false);
        }}
        rows={3}
        placeholder="보고서에 쓸 메모를 남겨보세요 (나에게만 보입니다)"
        className="w-full rounded-md border border-border-strong p-2 text-sm outline-none focus:border-blue-500"
      />
      <div className="mt-1 flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {saving ? "저장 중..." : "저장"}
        </button>
        {saved && <span className="text-xs text-success">저장됨</span>}
      </div>
    </div>
  );
}
