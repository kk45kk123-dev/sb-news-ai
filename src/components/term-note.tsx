"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";

interface TermNoteProps {
  term: string;
  definition: string;
  children: React.ReactNode;
}

export function TermNote({ term, definition, children }: TermNoteProps) {
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
        className="font-medium text-foreground underline decoration-dotted decoration-muted-foreground/60 underline-offset-[3px] transition-colors hover:text-primary"
      >
        {children}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            ref={contentRef}
            role="tooltip"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="absolute left-1/2 top-full z-50 mt-2 w-max max-w-[260px] -translate-x-1/2 rounded-note border border-border bg-popover p-3 text-left shadow-popover"
          >
            <span className="mb-0.5 block text-xs font-semibold text-muted-foreground">{term}</span>
            <span className="block text-sm leading-relaxed text-popover-foreground">{definition}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}
