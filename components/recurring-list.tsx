'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { formatCurrency } from '@/lib/utils';
import { TRANSACTION_CATEGORIES } from '@/lib/constants';

type Recurring = {
  id: string;
  label: string;
  amount: number;
  direction: 'expense' | 'income' | 'transfer';
  category: string;
  dayOfMonth: number;
  active: boolean;
  lastPosted: string | null;
};

export default function RecurringList() {
  const { data, mutate: refresh } = useSWR<{ items: Recurring[] }>('/api/recurring');
  const items = data?.items ?? [];
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Utilities');
  const [day, setDay] = useState(25);
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (!label.trim() || !amount) return;
    setBusy(true);
    try {
      await fetch('/api/recurring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: label.trim(),
          amount: Number(amount),
          category,
          dayOfMonth: day
        })
      });
      setLabel('');
      setAmount('');
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (item: Recurring) => {
    await fetch('/api/recurring', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, active: !item.active })
    });
    await refresh();
  };

  const remove = async (id: string) => {
    await fetch(`/api/recurring?id=${id}`, { method: 'DELETE' });
    await refresh();
  };

  return (
    <div className="card">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Recurring</h2>
        <p className="mt-1 text-sm text-slate-600">Bills &amp; subscriptions.</p>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Listrik"
          className="col-span-2 input"
        />
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="amount"
          type="number"
          className="input"
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="input">
          {TRANSACTION_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          value={day}
          onChange={(e) => setDay(Number(e.target.value))}
          type="number"
          min={1}
          max={28}
          className="input"
          title="Day of month"
        />
        <button onClick={add} disabled={busy} className="btn btn-primary disabled:opacity-60">
          Add
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-slate-600">No recurring items. Add bills to auto-post each period.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
              <div>
                <p className={`font-medium ${item.active ? 'text-slate-900' : 'text-slate-500 line-through'}`}>
                  {item.label}
                </p>
                <p className="text-xs text-slate-600">
                  {formatCurrency(item.amount)} · {item.category} · day {item.dayOfMonth}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => toggle(item)} className="btn btn-secondary px-2.5 py-1 text-xs">
                  {item.active ? 'Pause' : 'Resume'}
                </button>
                <button onClick={() => remove(item.id)} className="btn btn-danger-soft px-2.5 py-1 text-xs">
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