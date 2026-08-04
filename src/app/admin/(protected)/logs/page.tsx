"use client";

import { useEffect, useState, useCallback } from "react";

type Tab = "crawl" | "ai" | "audit";

const TABS: { key: Tab; label: string; endpoint: string }[] = [
  { key: "crawl", label: "수집 로그", endpoint: "/api/v1/admin/logs/crawl" },
  { key: "ai", label: "AI 호출 로그", endpoint: "/api/v1/admin/logs/ai" },
  { key: "audit", label: "감사 로그", endpoint: "/api/v1/admin/logs/audit" },
];

function fmtDate(v: string | null) {
  if (!v) return "-";
  return new Date(v).toLocaleString("ko-KR");
}

export default function AdminLogsPage() {
  const [tab, setTab] = useState<Tab>("crawl");
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const endpoint = TABS.find((t) => t.key === tab)!.endpoint;
    const res = await fetch(endpoint);
    const body = await res.json();
    if (body.success) {
      setRows(body.data);
      setTotal(body.meta?.total ?? body.data.length);
    }
    setLoading(false);
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-navy-900">로그</h1>

      <div className="mb-4 flex gap-2 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium ${
              tab === t.key ? "border-b-2 border-blue-600 text-blue-600" : "text-text-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-text-muted">불러오는 중...</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-bg">
          <p className="border-b border-border p-2 text-xs text-text-subtle">총 {total}건 (최근 50건 표시)</p>
          {tab === "crawl" && <CrawlTable rows={rows as unknown as CrawlRow[]} />}
          {tab === "ai" && <AiTable rows={rows as unknown as AiRow[]} />}
          {tab === "audit" && <AuditTable rows={rows as unknown as AuditRow[]} />}
          {rows.length === 0 && <p className="p-6 text-center text-sm text-text-muted">로그가 없습니다.</p>}
        </div>
      )}
    </div>
  );
}

interface CrawlRow {
  id: string;
  source: { name: string };
  status: string;
  itemsFound: number;
  itemsNew: number;
  startedAt: string;
  finishedAt: string | null;
  errorMessage: string | null;
}

function CrawlTable({ rows }: { rows: CrawlRow[] }) {
  if (rows.length === 0) return null;
  return (
    <table className="w-full text-sm">
      <thead className="bg-bg-subtle text-left text-xs text-text-subtle">
        <tr>
          <th className="p-2">출처</th>
          <th className="p-2">상태</th>
          <th className="p-2">발견/신규</th>
          <th className="p-2">시작</th>
          <th className="p-2">에러</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-t border-border">
            <td className="p-2">{r.source.name}</td>
            <td className={`p-2 ${r.status === "success" ? "text-success" : "text-danger"}`}>{r.status}</td>
            <td className="p-2 tabular-nums">{r.itemsFound} / {r.itemsNew}</td>
            <td className="p-2 text-text-muted">{fmtDate(r.startedAt)}</td>
            <td className="max-w-xs truncate p-2 text-xs text-danger">{r.errorMessage}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

interface AiRow {
  id: string;
  taskType: string;
  model: { displayName: string } | null;
  status: string;
  tokenInput: number | null;
  tokenOutput: number | null;
  latencyMs: number | null;
  createdAt: string;
  error: string | null;
}

function AiTable({ rows }: { rows: AiRow[] }) {
  if (rows.length === 0) return null;
  return (
    <table className="w-full text-sm">
      <thead className="bg-bg-subtle text-left text-xs text-text-subtle">
        <tr>
          <th className="p-2">작업</th>
          <th className="p-2">모델</th>
          <th className="p-2">상태</th>
          <th className="p-2">토큰(입/출)</th>
          <th className="p-2">지연</th>
          <th className="p-2">시각</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-t border-border" title={r.error ?? undefined}>
            <td className="p-2">{r.taskType}</td>
            <td className="p-2 text-text-muted">{r.model?.displayName ?? "-"}</td>
            <td className={`p-2 ${r.status === "success" ? "text-success" : "text-danger"}`}>{r.status}</td>
            <td className="p-2 tabular-nums">{r.tokenInput ?? "-"} / {r.tokenOutput ?? "-"}</td>
            <td className="p-2 tabular-nums">{r.latencyMs ? `${r.latencyMs}ms` : "-"}</td>
            <td className="p-2 text-text-muted">{fmtDate(r.createdAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

interface AuditRow {
  id: string;
  action: string;
  user: { name: string; email: string } | null;
  targetType: string | null;
  createdAt: string;
}

function AuditTable({ rows }: { rows: AuditRow[] }) {
  if (rows.length === 0) return null;
  return (
    <table className="w-full text-sm">
      <thead className="bg-bg-subtle text-left text-xs text-text-subtle">
        <tr>
          <th className="p-2">액션</th>
          <th className="p-2">사용자</th>
          <th className="p-2">대상</th>
          <th className="p-2">시각</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-t border-border">
            <td className="p-2 font-mono text-xs">{r.action}</td>
            <td className="p-2 text-text-muted">{r.user?.name ?? "시스템"}</td>
            <td className="p-2 text-text-muted">{r.targetType ?? "-"}</td>
            <td className="p-2 text-text-muted">{fmtDate(r.createdAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
