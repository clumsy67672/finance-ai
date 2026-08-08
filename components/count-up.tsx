'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Animate a number toward `target` with an ease-out-quart curve (no bounce).
 * Honors prefers-reduced-motion — jumps straight to the final value.
 * Pass `instant` when you want no animation (e.g. the count never changes).
 */
export function useCountUp(target: number, duration = 750): number {
  const [display, setDisplay] = useState<number>(target);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    // Reduced motion: snap to the final figure, no rAF.
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || target === 0) {
      setDisplay(target);
      return;
    }

    const from = 0;
    const start = performance.now();
    const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);

    const step = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setDisplay(from + (target - from) * easeOutQuart(p));
      if (p < 1) {
        raf.current = requestAnimationFrame(step);
      } else {
        setDisplay(target);
      }
    };

    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current);
    };
  }, [target, duration]);

  return display;
}