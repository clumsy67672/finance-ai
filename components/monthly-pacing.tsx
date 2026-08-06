'use client';

import useSWR from 'swr';
import { formatCurrency } from '@/lib/utils';
import type { SummaryStats } from '@/types';
import { usePeriod } from './period-context';

export default function MonthlyPacing() {
  const { period } = usePeriod();
  const { data } = useSWR<SummaryStats>(`/api/stats/summary?period=${period}`);

  if (!data?.pacing) return null;

  const { spent, income, expectedByToday, pacingPercent, overPace } = data.pacing;

  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm ${
        overPace ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-white'
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">Pacing</p>
          <h2 className="text-lg font-semibold text-slate-900">Burn rate</h2>
        </div>
        <span
          className={`rounded-full px-3 py-0.5 text-xs font-semibold uppercase tracking-wide ${
            overPace ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
          }`}
        >
          {overPace ? 'Ahead of pace' : 'On track'}
        </span>
      </div>
      <p className={`text-sm ${overPace ? 'text-rose-700' : 'text-slate-600'}`}>
        You&apos;ve spent <span className="font-semibold">{formatCurrency(spent)}</span> of{' '}
        {income > 0 ? (
          <>
            your <span className="font-semibold">{formatCurrency(income)}</span> income.{' '}
            {overPace
              ? `You're ${pacingPercent}% past the expected ${formatCurrency(expectedByToday)} for this point in the period — slow down.`
              : `You're at ${pacingPercent}% of the expected ${formatCurrency(expectedByToday)} for this point in the period.`}
          </>
        ) : (
          'no income recorded this period.'
        )}
      </p>
    </div>
  );
}
