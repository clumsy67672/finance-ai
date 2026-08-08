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
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5">
      <p className="text-xs font-medium text-slate-600">
        Today · {format(new Date(), 'EEE dd MMM')}
      </p>
      <span className="hidden h-4 w-px bg-slate-200 sm:block" />
      <div className="flex items-baseline gap-1.5">
        <span className="text-xs text-slate-600">Spent</span>
        <span className="text-sm font-semibold text-rose-600">
          {today ? formatCurrency(today.spent) : '—'}
        </span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-xs text-slate-600">Earned</span>
        <span className="text-sm font-semibold text-emerald-600">
          {today ? formatCurrency(today.income) : '—'}
        </span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-xs text-slate-600">Net</span>
        <span className="text-sm font-semibold text-slate-900">
          {today ? formatCurrency(today.net) : '—'}
        </span>
      </div>
      {today ? (
        <div className="flex items-baseline gap-1.5">
          <span className="text-xs text-slate-600">Entries</span>
          <span className="text-sm font-semibold text-slate-600">{today.count}</span>
        </div>
      ) : null}
    </div>
  );
}