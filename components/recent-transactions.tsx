'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { format } from 'date-fns';
import type { TransactionResponse } from '@/types';
import { formatCurrency } from '@/lib/utils';

export default function RecentTransactions() {
  const { data, mutate } = useSWR<{ transactions: TransactionResponse[] }>('/api/transactions?limit=20');
  const transactions = data?.transactions ?? [];

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this transaction?')) return;
    await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
    mutate();
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">Latest entries</p>
          <h2 className="text-lg font-semibold text-slate-900">Recent transactions</h2>
        </div>
        <Link href="/transactions" className="text-sm font-medium text-slate-900">
          View all
        </Link>
      </div>
      <ul className="divide-y divide-slate-100">
        {transactions.map((transaction) => (
          <li key={transaction.id} className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-slate-900">{transaction.cleanNote}</p>
              <p className="text-xs text-slate-500">
                {format(new Date(transaction.occurredAt), 'dd MMM yyyy')} · {transaction.category}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`text-sm font-semibold ${
                  transaction.direction === 'income' ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {transaction.direction === 'income' ? '+' : '-'}
                {formatCurrency(transaction.amount)}
              </span>
              <button
                onClick={() => handleDelete(transaction.id)}
                className="text-xs text-slate-400 hover:text-rose-600"
                title="Delete"
              >
                ✕
              </button>
            </div>
          </li>
        ))}
        {!transactions.length && <p className="py-4 text-sm text-slate-500">Add your first transaction.</p>}
      </ul>
    </div>
  );
}
