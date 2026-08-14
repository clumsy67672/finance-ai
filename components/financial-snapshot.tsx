'use client';

import useSWR from 'swr';
import { formatCurrency } from '@/lib/utils';
import { usePeriod } from './period-context';
import type { SummaryStats } from '@/types';

type Goal = { id: string; title: string; amount: number; saved: number; achieved: boolean };
type Challenge = { id: string; title: string; amount: number; active: boolean; severity: string };

export default function FinancialSnapshot() {
  const { period } = usePeriod();
  const { data: stats } = useSWR<SummaryStats>(`/api/stats/summary?period=${period}`);
  const { data: goalsData } = useSWR<{ goals: Goal[] }>('/api/goals');
  const { data: challengesData } = useSWR<{ challenges: Challenge[] }>('/api/challenges');

  const goals = goalsData?.goals ?? [];
  const challenges = challengesData?.challenges ?? [];

  const totalGoalTarget = goals.reduce((s, g) => s + g.amount, 0);
  const totalSaved = goals.reduce((s, g) => s + g.saved, 0);
  const totalChallenges = challenges.filter((c) => c.active).reduce((s, c) => s + c.amount, 0);
  const monthlyIncome = stats?.totalIncome ?? 0;
  const monthlyGap = monthlyIncome - totalChallenges;

  const criticalCount = challenges.filter((c) => c.active && c.severity === 'critical').length;

  return (
    <div className={`rounded-xl border p-5 ${monthlyGap < 0 ? 'border-rose-200 bg-rose-50' : 'border-emerald-200 bg-emerald-50'}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Financial Snapshot</h2>
        <span className={`rounded-full px-3 py-0.5 text-xs font-semibold ${monthlyGap < 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
          {monthlyGap < 0 ? 'Over-committed' : 'Sustainable'}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <p className="text-xs text-slate-600">Monthly income</p>
          <p className="font-semibold text-slate-900">{formatCurrency(monthlyIncome)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-600">Monthly obligations</p>
          <p className="font-semibold text-rose-600">–{formatCurrency(totalChallenges)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-600">Remaining</p>
          <p className={`font-semibold ${monthlyGap < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {formatCurrency(monthlyGap)}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-600">Goals progress</p>
          <p className="font-semibold text-slate-900">
            {formatCurrency(totalSaved)} / {formatCurrency(totalGoalTarget)}
          </p>
        </div>
      </div>

      {criticalCount > 0 ? (
        <p className="mt-3 rounded-lg bg-white/70 px-3 py-2 text-sm font-medium text-rose-700">
          {criticalCount} critical obligation{criticalCount > 1 ? 's' : ''} requiring attention
        </p>
      ) : null}
    </div>
  );
}
