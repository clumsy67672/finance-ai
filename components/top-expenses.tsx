'use client';

import useSWR from 'swr';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';

export default function TopExpenses() {
  const { data } = useSWR<{ expenses: Array<{ id: string; cleanNote: string; category: string; amount: number; occurredAt: string }> }>(
    '/api/stats/top-expenses'
  );
  const expenses = data?.expenses ?? [];

  if (!expenses.length) {
    return <p className="text-sm text-slate-500">No expenses found.</p>;
  }

  return (
    <ul className="space-y-3">
      {expenses.map((item) => (
        <li key={item.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
          <div>
            <p className="font-medium text-slate-900">{item.cleanNote}</p>
            <p className="text-xs text-slate-500">
              {item.category} · {format(new Date(item.occurredAt), 'dd MMM')}
            </p>
          </div>
          <span className="text-sm font-semibold text-rose-600">-{formatCurrency(item.amount)}</span>
        </li>
      ))}
    </ul>
  );
}
