export function CategoryChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-sm bg-blue-100 px-2 py-0.5 text-xs font-medium text-navy-700">
      {label}
    </span>
  );
}
