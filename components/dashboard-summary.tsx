'use client';

import useSWR from 'swr';
import { formatCurrency } from '@/lib/utils';
import type { SummaryStats } from '@/types';
import { usePeriod, PERIOD_OPTIONS } from './period-context';

const CARDS = [
  { key: 'totalIncome' as const, label: 'Income', accent: 'text-emerald-600' },
  { key: 'totalExpense' as const, label: 'Expense', accent: 'text-rose-600' },
  { key: 'net' as const, label: 'Net', accent: 'text-slate-900' },
  { key: 'count' as const, label: 'Transactions', accent: 'text-slate-700' },
];

export default function DashboardSummary() {
  const { period, setPeriod } = usePeriod();
  const { data: stats } = useSWR<SummaryStats>(`/api/stats/summary?period=${period}`);

  return (
    <section aria-label="Period summary" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">
          {stats?.periodLabel ?? 'Loading…'}
        </h2>
        <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
          {PERIOD_OPTIONS.map((o) => (
            <button
              key={o.key}
              onClick={() => setPeriod(o.key)}
              aria-pressed={period === o.key}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                period === o.key
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {CARDS.map((card) => {
          const value = stats
            ? card.key === 'count'
              ? stats.count
              : (stats as unknown as Record<string, number>)[card.key]
            : null;
          const label = card.label;
          const display =
            value === null || value === undefined
              ? '—'
              : card.key === 'count'
                ? String(value)
                : formatCurrency(value);
          return (
            <div
              key={card.key}
              className="flex min-w-0 flex-col rounded-lg border border-slate-200 bg-white py-3 pl-4 pr-3"
            >
              <dt className="truncate text-xs font-medium text-slate-600">{label}</dt>
              <dd className="mt-0.5 min-w-0 break-words text-xl font-semibold leading-tight tabular-nums">
                <span className={value === null ? 'text-slate-400' : card.accent}>{display}</span>
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}