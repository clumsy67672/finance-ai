'use client';

import { useState } from 'react';
import useSWR, { mutate } from 'swr';
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
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <p className="text-sm text-slate-500">Bills &amp; subscriptions</p>
        <h2 className="text-lg font-semibold text-slate-900">Recurring</h2>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Listrik"
          className="col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="amount"
          type="number"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
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
          value={day}
          onChange={(e) => setDay(Number(e.target.value))}
          type="number"
          min={1}
          max={28}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          title="Day of month"
        />
        <button
          onClick={add}
          disabled={busy}
          className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          Add
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-slate-500">No recurring items. Add bills to auto-post each period.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between rounded-xl border border-slate-200 p-3"
            >
              <div>
                <p className={`font-medium ${item.active ? 'text-slate-900' : 'text-slate-400 line-through'}`}>
                  {item.label}
                </p>
                <p className="text-xs text-slate-500">
                  {formatCurrency(item.amount)} · {item.category} · day {item.dayOfMonth}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => toggle(item)}
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                >
                  {item.active ? 'Pause' : 'Resume'}
                </button>
                <button
                  onClick={() => remove(item.id)}
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
