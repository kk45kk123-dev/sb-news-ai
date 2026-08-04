import type { Confidence } from "@/lib/schemas/news.schema";
import { Badge } from "@/components/ui/badge";

const MAP: Record<Confidence, { label: string; variant: "success" | "warning" | "muted" }> = {
  high: { label: "확신도 높음", variant: "success" },
  medium: { label: "확신도 보통", variant: "warning" },
  low: { label: "확신도 낮음", variant: "muted" },
};

export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  const meta = MAP[confidence];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}
