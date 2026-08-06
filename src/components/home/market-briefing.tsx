"use client";

import { Line, LineChart, ResponsiveContainer } from "recharts";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { useMarketQuery } from "@/lib/query/use-market";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function MarketBriefing() {
  const { data, isLoading } = useMarketQuery();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">오늘의 시장 브리핑</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 pt-0">
        {isLoading || !data
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[84px] w-full rounded-lg" />)
          : data.items.map((m) => {
              const isUp = m.change > 0;
              const isDown = m.change < 0;
              const color = isUp ? "hsl(var(--destructive))" : isDown ? "hsl(var(--secondary))" : "hsl(var(--muted-foreground))";
              const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
              return (
                <div key={m.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-medium text-muted-foreground">{m.label}</p>
                    {!m.isLive && (
                      <span className="rounded-full bg-muted px-1.5 py-px text-[10px] font-medium text-muted-foreground">
                        고시 기준
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-lg font-bold tabular-nums">{m.value}</p>
                  <div className="mt-1 flex items-center justify-between">
                    <span
                      className={cn(
                        "flex items-center gap-0.5 text-xs font-semibold tabular-nums",
                        isUp && "text-destructive",
                        isDown && "text-secondary",
                        !isUp && !isDown && "text-muted-foreground"
                      )}
                    >
                      <Icon className="h-3 w-3" />
                      {m.changeLabel}
                    </span>
                    <div className="h-6 w-14">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={m.trend.map((v) => ({ v }))}>
                          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.75} dot={false} isAnimationActive={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              );
            })}
      </CardContent>
    </Card>
  );
}
