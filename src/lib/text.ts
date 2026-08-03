const HTML_TAG_RE = /<[^>]*>/g;
const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

export function stripHtml(input: string): string {
  return input.replace(HTML_TAG_RE, "");
}

export function decodeHtmlEntities(input: string): string {
  return input.replace(/&[a-z#0-9]+;/gi, (entity) => HTML_ENTITIES[entity] ?? entity);
}

export function collapseWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

/** RSS 피드의 title/description 정제 — [2] NORMALIZE 단계에서 사용 (§5.2). */
export function normalizeText(input: string): string {
  return collapseWhitespace(decodeHtmlEntities(stripHtml(input)));
}
