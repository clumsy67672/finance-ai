'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

export type Period = 'payperiod' | 'month' | 'year' | 'all';

type Ctx = { period: Period; setPeriod: (p: Period) => void };

const PeriodContext = createContext<Ctx | null>(null);

export const PERIOD_OPTIONS: { key: Period; label: string }[] = [
  { key: 'payperiod', label: 'Pay period' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
  { key: 'all', label: 'All' },
];

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [period, setPeriod] = useState<Period>('payperiod');
  return (
    <PeriodContext.Provider value={{ period, setPeriod }}>
      {children}
    </PeriodContext.Provider>
  );
}

export function usePeriod(): Ctx {
  const ctx = useContext(PeriodContext);
  if (!ctx) throw new Error('usePeriod must be used within DashboardProvider');
  return ctx;
}
