import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  delta?: number;
  deltaSuffix?: string;
}

export function StatCard({ icon: Icon, label, value, delta, deltaSuffix = "%" }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between p-5">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1.5 text-2xl font-extrabold tabular-nums tracking-tight">{value}</p>
          {delta !== undefined && (
            <p
              className={cn(
                "mt-1 flex items-center gap-0.5 text-xs font-semibold tabular-nums",
                delta >= 0 ? "text-success" : "text-destructive"
              )}
            >
              {delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(delta)}
              {deltaSuffix} 전주 대비
            </p>
          )}
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
      </CardContent>
    </Card>
  );
}
