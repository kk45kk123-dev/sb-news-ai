"use client";

import { motion } from "framer-motion";
import { Check, Loader2, X } from "lucide-react";
import type { PipelineStep } from "@/lib/schemas/admin.schema";
import { cn } from "@/lib/utils";

export function PipelineStepper({ steps }: { steps: PipelineStep[] }) {
  return (
    <ol className="relative space-y-0">
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        return (
          <li key={step.id} className="relative flex gap-3 pb-6">
            {!isLast && (
              <span
                className={cn(
                  "absolute left-[13px] top-7 h-full w-px",
                  step.status === "done" ? "bg-primary" : "bg-border"
                )}
              />
            )}
            <span
              className={cn(
                "z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors",
                step.status === "done" && "border-primary bg-primary text-primary-foreground",
                step.status === "running" && "border-primary bg-primary/10 text-primary",
                step.status === "pending" && "border-border bg-card text-muted-foreground",
                step.status === "error" && "border-destructive bg-destructive/10 text-destructive"
              )}
            >
              {step.status === "done" && <Check className="h-3.5 w-3.5" />}
              {step.status === "running" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {step.status === "error" && <X className="h-3.5 w-3.5" />}
              {step.status === "pending" && <span>{i + 1}</span>}
            </span>
            <motion.div
              initial={false}
              animate={{ opacity: step.status === "pending" ? 0.5 : 1 }}
              className="flex-1 pt-0.5"
            >
              <p className={cn("text-sm font-semibold", step.status === "pending" ? "text-muted-foreground" : "text-foreground")}>
                {step.label}
              </p>
              {step.detail && <p className="mt-0.5 text-xs text-muted-foreground">{step.detail}</p>}
            </motion.div>
          </li>
        );
      })}
    </ol>
  );
}
