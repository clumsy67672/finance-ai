'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Replays the route-enter animation on every client-side navigation
 * (Overview → Transactions → Budgets). Keying the wrapper by pathname makes
 * React remount it when the route changes, re-firing the CSS animation.
 * Collapses to nothing under prefers-reduced-motion (global guard).
 */
export default function RouteTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="route-enter">
      {children}
    </div>
  );
}