"use client";

import { useEffect, useRef, useState } from "react";

/** Animate a number from 0 → target with easeOutCubic when `start` flips true. */
export function useCountUp(target: number, opts: { duration?: number; start?: boolean } = {}) {
  const { duration = 1700, start = true } = opts;
  const [value, setValue] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (!start) return;

    // Respect reduced-motion: jump straight to the target.
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }

    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(target * eased);
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else setValue(target);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [target, duration, start]);

  return value;
}

/** Compact human formatting: 1_284_500 → "1.28M". */
export function formatCompact(n: number, digits = 1): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(digits)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(digits)}K`;
  return Math.round(n).toString();
}
