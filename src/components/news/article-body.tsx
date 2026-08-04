import { annotate } from "@/lib/annotate";

export function ArticleBody({ text }: { text: string }) {
  return (
    <div className="whitespace-pre-line text-[15px] leading-[1.9] text-foreground">{annotate(text)}</div>
  );
}
