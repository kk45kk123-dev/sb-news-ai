import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

export function AiImportance({ score, className }: { score: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} title={`AI 중요도 ${score}/5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Flame
          key={i}
          className={cn("h-3 w-3", i < score ? "fill-accent text-accent" : "fill-none text-muted-foreground/30")}
        />
      ))}
    </span>
  );
}
