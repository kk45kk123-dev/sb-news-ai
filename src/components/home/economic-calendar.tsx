"use client";

import { CalendarDays } from "lucide-react";
import { useUpcomingEconomicEventsQuery } from "@/lib/query/use-economic-event";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const IMPORTANCE_LABEL: Record<"high" | "medium" | "low", { label: string; variant: "destructive" | "warning" | "muted" }> = {
  high: { label: "중요", variant: "destructive" },
  medium: { label: "보통", variant: "warning" },
  low: { label: "참고", variant: "muted" },
};

export function EconomicCalendar() {
  const { data: events, isLoading } = useUpcomingEconomicEventsQuery();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarDays className="h-4 w-4 text-muted-foreground" /> 경제 일정
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 pt-0">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)
        ) : !events || events.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">다가오는 일정이 없습니다.</p>
        ) : (
          events.map((e) => {
            const meta = IMPORTANCE_LABEL[e.importance];
            return (
              <div key={e.id} className="flex items-center gap-3 rounded-lg px-1.5 py-2 transition-colors hover:bg-muted/60">
                <div className="w-12 shrink-0 text-center">
                  <p className="text-xs font-bold text-foreground">{e.date}</p>
                  <p className="text-[10px] text-muted-foreground">{e.time}</p>
                </div>
                <p className={cn("flex-1 text-xs leading-snug text-foreground")}>{e.title}</p>
                <Badge variant={meta.variant} className="shrink-0">
                  {meta.label}
                </Badge>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
