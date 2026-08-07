'use client';

import useSWR from 'swr';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import type { SummaryStats } from '@/types';
import { usePeriod } from './period-context';

export default function TodaySummary() {
  const { period } = usePeriod();
  const { data } = useSWR<SummaryStats>(`/api/stats/summary?period=${period}`);
  const today = data?.today;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <p className="text-sm text-slate-500">Today</p>
        <p className="text-lg font-semibold text-slate-900">{format(new Date(), 'EEE, dd MMM yyyy')}</p>
      </div>
      <dl className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-rose-50/60 p-4">
          <dt className="text-xs uppercase tracking-wide text-slate-500">Spent today</dt>
          <dd className="mt-2 text-2xl font-semibold text-rose-600">
            {today ? formatCurrency(today.spent) : '—'}
          </dd>
        </div>
        <div className="rounded-xl bg-emerald-50/60 p-4">
          <dt className="text-xs uppercase tracking-wide text-slate-500">Earned today</dt>
          <dd className="mt-2 text-2xl font-semibold text-emerald-600">
            {today ? formatCurrency(today.income) : '—'}
          </dd>
        </div>
        <div className="rounded-xl bg-slate-50 p-4">
          <dt className="text-xs uppercase tracking-wide text-slate-500">Net today</dt>
          <dd className="mt-2 text-2xl font-semibold text-slate-900">
            {today ? formatCurrency(today.net) : '—'}
          </dd>
        </div>
        <div className="rounded-xl bg-slate-50 p-4">
          <dt className="text-xs uppercase tracking-wide text-slate-500">Entries</dt>
          <dd className="mt-2 text-2xl font-semibold text-slate-600">{today ? today.count : '—'}</dd>
        </div>
      </dl>
    </div>
  );
}