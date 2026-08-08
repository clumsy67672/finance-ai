'use client';

import useSWR from 'swr';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { usePeriod } from './period-context';

export default function TopExpenses() {
  const { period } = usePeriod();
  const { data } = useSWR<{
    expenses: Array<{ id: string; cleanNote: string; category: string; amount: number; occurredAt: string }>;
  }>(`/api/stats/top-expenses?period=${period}`);
  const expenses = data?.expenses ?? [];

  if (!expenses.length) {
    return <p className="text-sm text-slate-500">No expenses found.</p>;
  }

  return (
    <ul className="divide-y divide-slate-100">
      {expenses.map((item) => (
        <li key={item.id} className="flex items-center justify-between gap-3 py-2.5">
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-900">{item.cleanNote}</p>
            <p className="text-xs text-slate-600">
              {item.category} · {format(new Date(item.occurredAt), 'dd MMM')}
            </p>
          </div>
          <span className="shrink-0 text-sm font-semibold text-rose-600">-{formatCurrency(item.amount)}</span>
        </li>
      ))}
    </ul>
  );
}