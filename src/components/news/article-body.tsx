import { annotate } from "@/lib/annotate";

export function ArticleBody({ text }: { text: string }) {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="space-y-6 text-body-copy">
      {paragraphs.map((p, i) => (
        <p key={i} className="whitespace-pre-line">
          {annotate(p)}
        </p>
      ))}
    </div>
  );
}
