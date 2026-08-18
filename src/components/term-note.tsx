"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BookMarked } from "lucide-react";
import { MOTION } from "@/lib/motion";

interface TermNoteProps {
  term: string;
  definition: string;
  /** 이 기사에서 용어가 쓰인 맥락 한 문장 — 있을 때만 정의 아래에 보조 설명으로 표시한다. */
  context?: string;
  children: React.ReactNode;
}

export function TermNote({ term, definition, context, children }: TermNoteProps) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;

    function handlePointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (contentRef.current?.contains(target)) return;
      setOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <span className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className="rounded-[3px] font-semibold text-primary decoration-primary/40 decoration-dotted underline-offset-[3px] transition-colors duration-[220ms] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {children}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            ref={contentRef}
            role="tooltip"
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={MOTION.tooltip}
            className="absolute left-1/2 top-full z-50 mt-2 w-max max-w-[280px] -translate-x-1/2 rounded-note border border-border bg-popover p-4 text-left shadow-note"
          >
            <div className="mb-1.5 flex items-center gap-1.5">
              <BookMarked className="h-3.5 w-3.5 text-primary" strokeWidth={2} />
              <span className="text-[11px] font-bold uppercase tracking-wide text-primary">{term}</span>
            </div>
            <p className="text-[13.5px] leading-[1.65] text-popover-foreground">{definition}</p>
            {context && (
              <p className="mt-1.5 border-t border-border pt-1.5 text-[12px] leading-[1.6] text-muted-foreground">
                이 기사에서는: {context}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}
