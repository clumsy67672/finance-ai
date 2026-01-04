'use client';

import useSWR from 'swr';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import type { SummaryStats } from '@/types';

const CARDS = [
  { key: 'totalIncome', label: 'Income', accent: 'text-emerald-600' },
  { key: 'totalExpense', label: 'Expense', accent: 'text-rose-600' },
  { key: 'net', label: 'Net', accent: 'text-slate-900' },
  { key: 'count', label: 'Transactions', accent: 'text-slate-600' }
] as const;

export default function DashboardSummary() {
  const { data: stats } = useSWR<SummaryStats>('/api/stats/summary');
  const monthLabel = stats ? format(new Date(stats.month), 'MMMM yyyy') : '';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">This month</p>
          <p className="text-lg font-semibold text-slate-900">{monthLabel}</p>
        </div>
        <span className="text-xs uppercase tracking-wide text-slate-400">Overview</span>
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
