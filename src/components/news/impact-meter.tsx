import { cn } from "@/lib/utils";

const SEGMENT_COLOR = ["bg-secondary", "bg-secondary", "bg-primary", "bg-accent", "bg-destructive"];

interface ImpactMeterProps {
  label: string;
  score: number;
  className?: string;
}

export function ImpactMeter({ label, score, className }: ImpactMeterProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className="w-24 shrink-0 text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            className={cn("h-4 w-2.5 rounded-sm", i < score ? SEGMENT_COLOR[score - 1] : "bg-muted")}
          />
        ))}
      </div>
      <span className="text-xs font-bold tabular-nums text-foreground">{score}/5</span>
    </div>
  );
}
