import * as React from "react";
import { TermNote } from "@/components/term-note";
import { TERMS } from "@/lib/terms";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const TERM_KEYS = Object.keys(TERMS).sort((a, b) => b.length - a.length);
const TERM_REGEX = new RegExp(`(${TERM_KEYS.map(escapeRegExp).join("|")})`, "g");

export function annotate(text: string): React.ReactNode[] {
  return text.split(TERM_REGEX).map((part, i) => {
    const definition = TERMS[part];
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
