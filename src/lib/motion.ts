/**
 * Single source of truth for motion timing across the app. Hover/tooltip
 * interactions read as instantaneous at 220ms; accordions and page-level
 * transitions need the extra 30ms to read as a deliberate reveal rather
 * than a flicker. All easing is ease-out — motion decelerates into rest,
 * never bounces.
 */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export const MOTION = {
  hover: { duration: 0.22, ease: EASE_OUT },
  tooltip: { duration: 0.22, ease: EASE_OUT },
  accordion: { duration: 0.25, ease: EASE_OUT },
  page: { duration: 0.25, ease: EASE_OUT },
} as const;
