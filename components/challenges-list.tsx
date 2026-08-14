'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { formatCurrency } from '@/lib/utils';

type Challenge = {
  id: string;
  title: string;
  note: string | null;
  amount: number;
  startDate: string;
  endDate: string | null;
  active: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
};

const SEVERITY_STYLES = {
  low: { badge: 'bg-slate-100 text-slate-700', bar: 'bg-slate-400' },
  medium: { badge: 'bg-amber-100 text-amber-800', bar: 'bg-amber-500' },
  high: { badge: 'bg-orange-100 text-orange-800', bar: 'bg-orange-500' },
  critical: { badge: 'bg-rose-100 text-rose-800', bar: 'bg-rose-500' },
};

export default function ChallengesList() {
  const { data, mutate } = useSWR<{ challenges: Challenge[] }>('/api/challenges');
  const challenges = data?.challenges ?? [];
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [amount, setAmount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [severity, setSeverity] = useState<Challenge['severity']>('high');
  const [showForm, setShowForm] = useState(false);

  const create = async () => {
    if (!title || !amount) return;
    await fetch('/api/challenges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        note: note || null,
        amount: Number(amount),
        startDate: startDate || new Date().toISOString().split('T')[0],
        endDate: endDate || null,
        severity
      })
    });
    setTitle('');
    setNote('');
    setAmount('');
    setStartDate('');
    setEndDate('');
    setSeverity('high');
    setShowForm(false);
    mutate();
  };

  const toggleActive = async (c: Challenge) => {
    await fetch(`/api/challenges/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !c.active })
    });
    mutate();
  };

  const remove = async (id: string) => {
    await fetch(`/api/challenges/${id}`, { method: 'DELETE' });
    mutate();
  };

  const totalMonthly = challenges
    .filter((c) => c.active)
    .reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Challenges</h2>
          <p className="text-sm text-slate-600">Monthly obligations &amp; burdens.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary px-3 py-1.5 text-sm"
        >
          {showForm ? 'Cancel' : '+ Challenge'}
        </button>
      </div>

      {totalMonthly > 0 ? (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3">
          <p className="text-sm font-medium text-rose-800">
            Total monthly obligations: {formatCurrency(totalMonthly)}
          </p>
        </div>
      ) : null}

      {showForm ? (
        <div className="mb-4 grid grid-cols-1 gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Challenge name"
            className="input"
          />
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
            className="input"
          />
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Monthly amount"
            type="number"
            className="input"
          />
          <input
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            type="date"
            className="input"
            placeholder="Start date"
          />
          <input
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            type="date"
            className="input"
            placeholder="End date (optional)"
          />
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value as Challenge['severity'])}
            className="input"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          <button onClick={create} className="btn btn-primary col-span-1 sm:col-span-3">
            Save Challenge
          </button>
        </div>
      ) : null}

      {challenges.length === 0 ? (
        <p className="text-sm text-slate-600">No challenges tracked. Add your financial burdens.</p>
      ) : (
        <ul className="space-y-3">
          {challenges.map((c) => {
            const style = SEVERITY_STYLES[c.severity];
            return (
              <li
                key={c.id}
                className={`rounded-lg border p-3 ${c.active ? 'border-slate-200' : 'border-slate-100 bg-slate-50 opacity-60'}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className={`font-medium ${c.active ? 'text-slate-900' : 'text-slate-500 line-through'}`}>
                        {c.title}
                      </p>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${style.badge}`}>
                        {c.severity}
                      </span>
                    </div>
                    {c.note ? <p className="mt-0.5 text-xs text-slate-500">{c.note}</p> : null}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => toggleActive(c)}
                      className={`px-2 py-0.5 text-xs ${c.active ? 'btn btn-secondary' : 'btn btn-primary'}`}
                    >
                      {c.active ? 'Pause' : 'Resume'}
                    </button>
                    <button
                      onClick={() => remove(c.id)}
                      className="btn btn-danger-soft px-2 py-0.5 text-xs"
                    >
                      Del
                    </button>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className={c.active ? 'font-medium text-rose-600' : 'text-slate-400'}>
                    {formatCurrency(c.amount)}/mo
                  </span>
                  <span className="text-xs text-slate-500">
                    {new Date(c.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    {c.endDate
                      ? ` → ${new Date(c.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
                      : ' → ongoing'}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
