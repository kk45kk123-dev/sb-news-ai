import { annotate } from "@/lib/annotate";
import type { GlossaryTerm } from "@/lib/schemas/news.schema";

export function ArticleBody({ text, glossary }: { text: string; glossary?: GlossaryTerm[] }) {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const terms = glossary?.length ? Object.fromEntries(glossary.map((g) => [g.term, g.definition])) : undefined;

  return (
    <div className="space-y-6 text-body-copy">
      {paragraphs.map((p, i) => (
        <p key={i} className="whitespace-pre-line">
          {annotate(p, terms)}
        </p>
      ))}
    </div>
  );
}
