"use client";

import * as React from "react";
import { useTheme } from "next-themes";

/**
 * Resolves `--token` CSS custom properties to literal `hsl(...)` strings.
 * Needed because some SVG chart libraries (Recharts' Pie/Cell in particular)
 * set `fill` as a raw presentation attribute rather than a style property, and
 * that path does not reliably resolve `var(--x)` — the color renders invisible.
 * Re-resolves whenever the theme changes so charts stay correct in dark mode.
 */
export function useCssVarColors(varNames: string[]): Record<string, string> {
  const { resolvedTheme } = useTheme();
  const key = varNames.join(",");
  const [colors, setColors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    const styles = getComputedStyle(document.documentElement);
    const next: Record<string, string> = {};
    for (const name of key.split(",")) {
      if (!name) continue;
      next[name] = `hsl(${styles.getPropertyValue(name).trim()})`;
    }
    setColors(next);
  }, [key, resolvedTheme]);

  return colors;
}
