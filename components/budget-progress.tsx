'use client';

import useSWR from 'swr';
import { formatCurrency } from '@/lib/utils';
import { usePeriod } from './period-context';

type BudgetProgress = {
  category: string;
  target: number;
  spent: number;
  remaining: number;
  ratio: number;
  over: boolean;
};

export default function BudgetProgress() {
  const { period } = usePeriod();
  const { data } = useSWR<{ progress: BudgetProgress[] }>(`/api/stats/budget?period=${period}`);
  const progress = data?.progress ?? [];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <p className="text-sm text-slate-500">Budget vs actual</p>
        <h2 className="text-lg font-semibold text-slate-900">Category budgets</h2>
      </div>
      {progress.length === 0 ? (
        <p className="text-sm text-slate-500">
          No budgets set yet. Add one in the Budgets tab to track spending per category.
        </p>
      ) : (
        <ul className="space-y-3">
          {progress.map((b) => (
            <li key={b.category}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-900">{b.category}</span>
                <span className={b.over ? 'text-rose-600 font-semibold' : 'text-slate-500'}>
                  {formatCurrency(b.spent)} / {formatCurrency(b.target)}
                </span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${b.over ? 'bg-rose-500' : b.ratio > 0.85 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.round(b.ratio * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
