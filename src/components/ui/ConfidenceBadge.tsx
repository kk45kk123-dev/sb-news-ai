const META: Record<string, { label: string; className: string }> = {
  high: { label: "신뢰도 높음", className: "bg-bg-subtle text-text-muted" },
  medium: { label: "신뢰도 보통", className: "bg-bg-subtle text-text-muted" },
  low: { label: "정보 부족", className: "bg-warning/10 text-warning" },
};

export function ConfidenceBadge({ level }: { level: string }) {
  const meta = META[level] ?? META.medium!;
  return (
    <span className={`inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium ${meta.className}`}>
      {meta.label}
    </span>
  );
}
