'use client';

import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { format } from 'date-fns';
import type { TransactionResponse } from '@/types';
import { formatCurrency } from '@/lib/utils';

export default function RecentTransactions() {
  const { data, mutate } = useSWR<{ transactions: TransactionResponse[] }>('/api/transactions?limit=20');
  const transactions = data?.transactions ?? [];
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
    setConfirmingId(null);
    mutate();
  };

  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Recent transactions</h2>
        <Link href="/transactions" className="text-sm font-medium text-slate-900">
          View all
        </Link>
      </div>
      <ul className="divide-y divide-slate-100">
        {transactions.map((transaction) => (
          <li key={transaction.id} className="flex items-center justify-between gap-3 py-3">
            <div>
              <p className="font-medium text-slate-900">{transaction.cleanNote}</p>
              <p className="text-xs text-slate-600">
                {format(new Date(transaction.occurredAt), 'dd MMM yyyy')} · {transaction.category}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span
                className={`text-sm font-semibold tabular-nums ${
                  transaction.direction === 'income' ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {transaction.direction === 'income' ? '+' : '-'}
                {formatCurrency(transaction.amount)}
              </span>
              {confirmingId === transaction.id ? (
                <span className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleDelete(transaction.id)}
                    className="btn btn-danger-soft !px-2.5 !py-1 text-xs"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setConfirmingId(null)}
                    className="btn btn-secondary !px-2.5 !py-1 text-xs"
                  >
                    Keep
                  </button>
                </span>
              ) : (
                <button
                  onClick={() => setConfirmingId(transaction.id)}
                  className="text-sm text-slate-600 transition-colors hover:text-rose-600"
                  aria-label={`Delete ${transaction.cleanNote}`}
                >
                  ✕
                </button>
              )}
            </div>
          </li>
        ))}
        {!transactions.length && <p className="py-4 text-sm text-slate-500">Add your first transaction.</p>}
      </ul>
    </div>
  );
}