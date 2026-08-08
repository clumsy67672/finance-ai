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
    <div className="card">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Set budgets</h2>
        <p className="mt-1 text-sm text-slate-600">Monthly target per category.</p>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2">
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="input">
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
          className="input"
        />
        <button onClick={save} className="btn btn-primary">
          Set
        </button>
      </div>

      {budgets.length === 0 ? (
        <p className="text-sm text-slate-600">No budgets set. Set a monthly target above.</p>
      ) : (
        <ul className="space-y-2">
          {budgets.map((b) => (
            <li key={b.category} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
              <span className="font-medium text-slate-900">{b.category}</span>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-600">{formatCurrency(b.amount)}</span>
                <button onClick={() => remove(b.category)} className="btn btn-danger-soft px-2.5 py-1 text-xs">
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