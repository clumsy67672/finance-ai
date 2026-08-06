'use client';

import useSWR from 'swr';
import { formatCurrency } from '@/lib/utils';
import type { SummaryStats } from '@/types';
import { usePeriod, PERIOD_OPTIONS } from './period-context';

const CARDS = [
  { key: 'totalIncome', label: 'Income', accent: 'text-emerald-600' },
  { key: 'totalExpense', label: 'Expense', accent: 'text-rose-600' },
  { key: 'net', label: 'Net', accent: 'text-slate-900' },
  { key: 'count', label: 'Transactions', accent: 'text-slate-600' },
] as const;

export default function DashboardSummary() {
  const { period, setPeriod } = usePeriod();
  const { data: stats } = useSWR<SummaryStats>(`/api/stats/summary?period=${period}`);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">Summary</p>
          <p className="text-lg font-semibold text-slate-900">{stats?.periodLabel ?? '…'}</p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
          {PERIOD_OPTIONS.map((o) => (
            <button
              key={o.key}
              onClick={() => setPeriod(o.key)}
              className={`rounded-md px-2 py-1 text-xs font-medium transition ${
                period === o.key
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
      <dl className="grid gap-4 sm:grid-cols-2">
        {CARDS.map((card) => (
          <div key={card.key} className="rounded-xl bg-slate-50 p-4">
            <dt className="text-xs uppercase tracking-wide text-slate-500">{card.label}</dt>
            <dd className={`mt-2 text-2xl font-semibold ${card.accent}`}>
              {stats
                ? card.key === 'count'
                  ? stats.count
                  : formatCurrency((stats as any)[card.key] || 0)
                : '—'}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
