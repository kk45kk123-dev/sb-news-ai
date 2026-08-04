"use client";

import { Fragment, useEffect, useState, useCallback } from "react";
import { getCsrfToken } from "@/lib/csrf-client";

interface Source {
  id: string;
  name: string;
  type: string;
  url: string;
  status: string;
  isActive: boolean;
  credibility: number;
  fetchIntervalMin: number;
  consecutiveFailures: number;
}

interface TestResult {
  ok: boolean;
  itemCount: number;
  preview: { title: string; url: string; publishedAt: string }[];
  error?: string;
}

const STATUS_LABEL: Record<string, string> = {
  ok: "정상",
  error: "오류",
  needs_review: "검증 필요",
};

function authedFetch(url: string, options: RequestInit = {}) {
  return fetch(url, {
    ...options,
    headers: { ...options.headers, "x-csrf-token": getCsrfToken() ?? "" },
  });
}

export default function AdminSourcesPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [testingId, setTestingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", type: "rss", url: "", fetchIntervalMin: 30 });
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/v1/admin/sources");
    const body = await res.json();
    if (body.success) setSources(body.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const res = await authedFetch("/api/v1/admin/sources", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    const body = await res.json();
    if (!body.success) {
      setFormError(body.error.message);
      return;
    }
    setForm({ name: "", type: "rss", url: "", fetchIntervalMin: 30 });
    setShowForm(false);
    load();
  }

  async function handleTest(id: string) {
    setTestingId(id);
    const res = await authedFetch(`/api/v1/admin/sources/${id}/test`, { method: "POST" });
    const body = await res.json();
    setTestingId(null);
    if (body.success) {
      setTestResults((prev) => ({ ...prev, [id]: body.data }));
      load();
    }
  }

  async function handleFetchNow(id: string) {
    await authedFetch(`/api/v1/admin/sources/${id}/fetch-now`, { method: "POST" });
  }

  async function handleToggleActive(source: Source) {
    await authedFetch(`/api/v1/admin/sources/${source.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isActive: !source.isActive }),
    });
    load();
  }

  async function handleDelete(id: string) {
    const res = await authedFetch(`/api/v1/admin/sources/${id}`, { method: "DELETE" });
    const body = await res.json();
    if (!body.success) {
      alert(body.error.message);
      return;
    }
    load();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-navy-900">출처 관리</h1>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500"
        >
          + 새 출처 추가
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mb-4 space-y-2 rounded-lg border border-border bg-bg p-4">
          <div className="flex gap-2">
            <input
              placeholder="출처 이름"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="flex-1 rounded-md border border-border-strong px-2 py-1.5 text-sm"
            />
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="rounded-md border border-border-strong px-2 py-1.5 text-sm"
            >
              <option value="rss">RSS</option>
              <option value="api">API</option>
              <option value="scrape">Scrape</option>
            </select>
            <input
              placeholder="RSS URL"
              required
              type="url"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              className="flex-[2] rounded-md border border-border-strong px-2 py-1.5 text-sm"
            />
            <input
              type="number"
              min={5}
              max={1440}
              value={form.fetchIntervalMin}
              onChange={(e) => setForm({ ...form, fetchIntervalMin: Number(e.target.value) })}
              className="w-24 rounded-md border border-border-strong px-2 py-1.5 text-sm"
            />
          </div>
          {formError && <p className="text-sm text-danger">{formError}</p>}
          <button type="submit" className="rounded-md bg-navy-900 px-3 py-1.5 text-sm text-white">
            추가
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-text-muted">불러오는 중...</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-bg">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-bg-subtle text-left text-xs text-text-subtle">
              <tr>
                <th className="p-3">이름</th>
                <th className="p-3">유형</th>
                <th className="p-3">상태</th>
                <th className="p-3">주기(분)</th>
                <th className="p-3">활성</th>
                <th className="p-3">동작</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <Fragment key={s.id}>
                  <tr className="border-b border-border last:border-b-0">
                    <td className="p-3">
                      <div className="font-medium text-text">{s.name}</div>
                      <div className="max-w-xs truncate text-xs text-text-subtle">{s.url}</div>
                    </td>
                    <td className="p-3 text-text-muted">{s.type}</td>
                    <td className="p-3">
                      <span
                        className={`rounded-sm px-2 py-0.5 text-xs font-medium ${
                          s.status === "ok"
                            ? "bg-success/10 text-success"
                            : s.status === "error"
                              ? "bg-danger/10 text-danger"
                              : "bg-warning/10 text-warning"
                        }`}
                      >
                        {STATUS_LABEL[s.status] ?? s.status}
                        {s.consecutiveFailures > 0 && ` (연속 실패 ${s.consecutiveFailures}회)`}
                      </span>
                    </td>
                    <td className="p-3 text-text-muted">{s.fetchIntervalMin}</td>
                    <td className="p-3">
                      <input type="checkbox" checked={s.isActive} onChange={() => handleToggleActive(s)} />
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleTest(s.id)}
                          disabled={testingId === s.id}
                          className="rounded-md border border-border-strong px-2 py-1 text-xs hover:bg-bg-subtle disabled:opacity-50"
                        >
                          {testingId === s.id ? "테스트 중..." : "연결 테스트"}
                        </button>
                        <button
                          onClick={() => handleFetchNow(s.id)}
                          className="rounded-md border border-border-strong px-2 py-1 text-xs hover:bg-bg-subtle"
                        >
                          지금 수집
                        </button>
                        <button
                          onClick={() => handleDelete(s.id)}
                          className="rounded-md border border-danger px-2 py-1 text-xs text-danger hover:bg-danger/10"
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                  {testResults[s.id] && (
                    <tr key={`${s.id}-result`} className="border-b border-border bg-bg-subtle">
                      <td colSpan={6} className="p-3 text-xs">
                        {testResults[s.id]!.ok ? (
                          <div>
                            <p className="mb-1 font-medium text-success">
                              성공 — {testResults[s.id]!.itemCount}건 파싱됨
                            </p>
                            <ul className="list-inside list-disc text-text-muted">
                              {testResults[s.id]!.preview.map((p) => (
                                <li key={p.url}>{p.title}</li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <p className="font-medium text-danger">실패 — {testResults[s.id]!.error}</p>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {sources.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-text-muted">
                    등록된 출처가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
