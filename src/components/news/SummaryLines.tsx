export function SummaryLines({ lines }: { lines: string[] }) {
  return (
    <ul className="space-y-1 text-sm leading-relaxed text-text">
      {lines.map((line, i) => (
        <li key={i} className="flex gap-2">
          <span className="text-text-subtle">•</span>
          <span>{line}</span>
        </li>
      ))}
    </ul>
  );
}
