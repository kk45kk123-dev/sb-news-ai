import * as React from "react";
import { TermNote } from "@/components/term-note";
import { TERMS } from "@/lib/terms";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * `extraTerms` is the per-article glossary the AI analysis pipeline generates
 * (Analysis.glossary — see src/server/ai/schemas/analyze.schema.ts). It's
 * merged over the small static baseline dictionary (src/lib/terms.ts) so
 * every article gets at least the well-known baseline terms annotated even
 * when it has no AI analysis (e.g. manually-published articles skip AI
 * entirely — see manual-publish.service.ts).
 */
export function annotate(text: string, extraTerms?: Record<string, string>): React.ReactNode[] {
  const dict = extraTerms && Object.keys(extraTerms).length > 0 ? { ...TERMS, ...extraTerms } : TERMS;
  const keys = Object.keys(dict).sort((a, b) => b.length - a.length);
  if (keys.length === 0) return [text];

  const regex = new RegExp(`(${keys.map(escapeRegExp).join("|")})`, "g");
  return text.split(regex).map((part, i) => {
    const definition = dict[part];
    if (definition) {
      return (
        <TermNote key={i} term={part} definition={definition}>
          {part}
        </TermNote>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}
