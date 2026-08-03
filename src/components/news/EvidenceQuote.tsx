export function EvidenceQuote({ quotes, sourceUrl }: { quotes: string[]; sourceUrl: string }) {
  if (quotes.length === 0) return null;
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-text-subtle">근거 인용</p>
      {quotes.map((q, i) => (
        <a
          key={i}
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-sm border-l-2 border-border-strong bg-bg-subtle px-2 py-1 text-xs italic text-text-muted hover:border-blue-500 hover:text-text"
        >
          &ldquo;{q}&rdquo;
        </a>
      ))}
    </div>
  );
}
