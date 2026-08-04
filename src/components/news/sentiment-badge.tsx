import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import type { Sentiment } from "@/lib/schemas/news.schema";
import { Badge } from "@/components/ui/badge";

const MAP: Record<Sentiment, { label: string; variant: "success" | "destructive" | "muted"; icon: typeof TrendingUp }> = {
  positive: { label: "긍정", variant: "success", icon: TrendingUp },
  negative: { label: "부정", variant: "destructive", icon: TrendingDown },
  neutral: { label: "중립", variant: "muted", icon: Minus },
};

export function SentimentBadge({ sentiment }: { sentiment: Sentiment }) {
  const meta = MAP[sentiment];
  const Icon = meta.icon;
  return (
    <Badge variant={meta.variant}>
      <Icon className="h-3 w-3" /> {meta.label}
    </Badge>
  );
}
