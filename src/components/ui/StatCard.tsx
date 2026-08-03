export function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-bg p-4">
      <p className="text-xs text-text-subtle">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-navy-900">{value}</p>
    </div>
  );
}
