'use client';

import useSWR from 'swr';
import { formatCurrency } from '@/lib/utils';

type NeedsWants = {
  needs: number;
  wants: number;
  other: number;
  total: number;
};

export default function NeedsWantsBar() {
  const { data } = useSWR<NeedsWants>('/api/stats/needs-wants');

  if (!data || data.total === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-500">Needs vs Wants</p>
        <h2 className="text-lg font-semibold text-slate-900">Spending balance</h2>
        <p className="mt-3 text-sm text-slate-500">Add transactions to see the split.</p>
      </div>
    );
  }

  const needsPercent = Math.round((data.needs / data.total) * 100);
  const wantsPercent = Math.round((data.wants / data.total) * 100);
  const otherPercent = 100 - needsPercent - wantsPercent;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <p className="text-sm text-slate-500">Needs vs Wants</p>
        <h2 className="text-lg font-semibold text-slate-900">Spending balance</h2>
      </div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
        {needsPercent > 0 ? (
          <div
            className="bg-slate-900 transition-all"
            style={{ width: `${needsPercent}%` }}
            title={`Needs ${needsPercent}%`}
          />
        ) : null}
        {wantsPercent > 0 ? (
          <div
            className="bg-amber-400 transition-all"
            style={{ width: `${wantsPercent}%` }}
            title={`Wants ${wantsPercent}%`}
          />
        ) : null}
        {otherPercent > 0 ? (
          <div
            className="bg-slate-300 transition-all"
            style={{ width: `${otherPercent}%` }}
            title={`Other ${otherPercent}%`}
          />
        ) : null}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-slate-900" />
            <span className="font-medium text-slate-900">Needs</span>
          </div>
          <p className="mt-1 text-slate-600">{formatCurrency(data.needs)}</p>
          <p className="text-xs text-slate-400">{needsPercent}%</p>
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <span className="font-medium text-slate-900">Wants</span>
          </div>
          <p className="mt-1 text-slate-600">{formatCurrency(data.wants)}</p>
          <p className="text-xs text-slate-400">{wantsPercent}%</p>
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-slate-300" />
            <span className="font-medium text-slate-900">Other</span>
          </div>
          <p className="mt-1 text-slate-600">{formatCurrency(data.other)}</p>
          <p className="text-xs text-slate-400">{otherPercent}%</p>
        </div>
      </div>
    </div>
  );
}
