import * as React from "react";
import { TermNote } from "@/components/term-note";
import { TERMS } from "@/lib/terms";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export interface AnnotateTerm {
  definition: string;
  /** 이 기사에서 용어가 쓰인 맥락 한 문장 — AI가 채우는 선택 필드. */
  context?: string;
}

/**
 * `extraTerms` is the per-article glossary the AI analysis pipeline generates
 * (Analysis.glossary — see src/server/ai/schemas/analyze.schema.ts). It's
 * merged over the small static baseline dictionary (src/lib/terms.ts) so
 * every article gets at least the well-known baseline terms annotated even
 * when it has no AI analysis (e.g. manually-published articles skip AI
 * entirely — see manual-publish.service.ts). extraTerms wins on overlap, so
 * a new AI-extracted term is never hidden just because it's absent from the
 * static dictionary — the static dictionary is the fallback, not the primary
 * source.
 */
export function annotate(text: string, extraTerms?: Record<string, AnnotateTerm>): React.ReactNode[] {
  const staticDict: Record<string, AnnotateTerm> = Object.fromEntries(
    Object.entries(TERMS).map(([term, definition]) => [term, { definition }])
  );
  const dict = extraTerms && Object.keys(extraTerms).length > 0 ? { ...staticDict, ...extraTerms } : staticDict;
  const keys = Object.keys(dict).sort((a, b) => b.length - a.length);
  if (keys.length === 0) return [text];

  const regex = new RegExp(`(${keys.map(escapeRegExp).join("|")})`, "g");
  return text.split(regex).map((part, i) => {
    const entry = dict[part];
    if (entry) {
      return (
        <TermNote key={i} term={part} definition={entry.definition} context={entry.context}>
          {part}
        </TermNote>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}
