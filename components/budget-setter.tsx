'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { formatCurrency } from '@/lib/utils';
import { TRANSACTION_CATEGORIES } from '@/lib/constants';

export default function BudgetSetter() {
  const { data, mutate } = useSWR<{ budgets: Array<{ id: string; category: string; amount: number }> }>(
    '/api/budgets'
  );
  const budgets = data?.budgets ?? [];
  const [category, setCategory] = useState('Food & Drink');
  const [amount, setAmount] = useState('');

  const save = async () => {
    if (!amount) return;
    await fetch('/api/budgets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, amount: Number(amount) })
    });
    setAmount('');
    mutate();
  };

  const remove = async (cat: string) => {
    await fetch(`/api/budgets?category=${encodeURIComponent(cat)}`, { method: 'DELETE' });
    mutate();
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <p className="text-sm text-slate-500">Monthly target per category</p>
        <h2 className="text-lg font-semibold text-slate-900">Set budgets</h2>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          {TRANSACTION_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="amount"
          type="number"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          onClick={save}
          className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white"
        >
          Set
        </button>
      </div>

      {budgets.length === 0 ? (
        <p className="text-sm text-slate-500">No budgets set. Set a monthly target above.</p>
      ) : (
        <ul className="space-y-2">
          {budgets.map((b) => (
            <li
              key={b.category}
              className="flex items-center justify-between rounded-xl border border-slate-200 p-3"
            >
              <span className="font-medium text-slate-900">{b.category}</span>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-600">{formatCurrency(b.amount)}</span>
                <button
                  onClick={() => remove(b.category)}
                  className="rounded-md border border-rose-200 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
