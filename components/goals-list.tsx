'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { formatCurrency } from '@/lib/utils';

type Goal = {
  id: string;
  title: string;
  note: string | null;
  amount: number;
  saved: number;
  deadline: string | null;
  achieved: boolean;
};

export default function GoalsList() {
  const { data, mutate } = useSWR<{ goals: Goal[] }>('/api/goals');
  const goals = data?.goals ?? [];
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [amount, setAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [showForm, setShowForm] = useState(false);

  const create = async () => {
    if (!title || !amount) return;
    await fetch('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        note: note || null,
        amount: Number(amount),
        deadline: deadline || null
      })
    });
    setTitle('');
    setNote('');
    setAmount('');
    setDeadline('');
    setShowForm(false);
    mutate();
  };

  const updateSaved = async (goal: Goal, newSaved: number) => {
    await fetch(`/api/goals/${goal.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ saved: newSaved })
    });
    mutate();
  };

  const markAchieved = async (goal: Goal) => {
    await fetch(`/api/goals/${goal.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ achieved: true })
    });
    mutate();
  };

  const remove = async (id: string) => {
    await fetch(`/api/goals/${id}`, { method: 'DELETE' });
    mutate();
  };

  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Goals</h2>
          <p className="text-sm text-slate-600">What you&apos;re saving toward.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary px-3 py-1.5 text-sm"
        >
          {showForm ? 'Cancel' : '+ Goal'}
        </button>
      </div>

      {showForm ? (
        <div className="mb-4 grid grid-cols-1 gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Goal name"
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
            placeholder="Target amount"
            type="number"
            className="input"
          />
          <input
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            type="date"
            className="input"
          />
          <button onClick={create} className="btn btn-primary col-span-1 sm:col-span-4">
            Save Goal
          </button>
        </div>
      ) : null}

      {goals.length === 0 ? (
        <p className="text-sm text-slate-600">No goals set. Add your first savings goal.</p>
      ) : (
        <ul className="space-y-3">
          {goals.map((g) => {
            const ratio = g.amount > 0 ? Math.min(g.saved / g.amount, 1) : 0;
            const remaining = Math.max(g.amount - g.saved, 0);
            return (
              <li
                key={g.id}
                className={`rounded-lg border p-3 ${g.achieved ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200'}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className={`font-medium ${g.achieved ? 'text-emerald-700 line-through' : 'text-slate-900'}`}>
                      {g.title}
                    </p>
                    {g.note ? <p className="mt-0.5 text-xs text-slate-500">{g.note}</p> : null}
                  </div>
                  <div className="flex gap-1">
                    {!g.achieved ? (
                      <>
                        <button
                          onClick={() => updateSaved(g, g.saved + 100000)}
                          className="btn btn-secondary px-2 py-0.5 text-xs"
                        >
                          +100k
                        </button>
                        <button
                          onClick={() => markAchieved(g)}
                          className="btn btn-primary px-2 py-0.5 text-xs"
                        >
                          Done
                        </button>
                      </>
                    ) : null}
                    <button
                      onClick={() => remove(g.id)}
                      className="btn btn-danger-soft px-2 py-0.5 text-xs"
                    >
                      Del
                    </button>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className={g.achieved ? 'text-emerald-600' : 'text-slate-600'}>
                    {formatCurrency(g.saved)} / {formatCurrency(g.amount)}
                  </span>
                  <span className="text-xs text-slate-500">
                    {g.deadline
                      ? `Due ${new Date(g.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
                      : 'No deadline'}
                  </span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all ${g.achieved ? 'bg-emerald-500' : ratio > 0.75 ? 'bg-emerald-500' : ratio > 0.4 ? 'bg-amber-400' : 'bg-rose-400'}`}
                    style={{ width: `${Math.round(ratio * 100)}%` }}
                  />
                </div>
                {!g.achieved && remaining > 0 ? (
                  <p className="mt-1 text-xs text-slate-500">
                    {formatCurrency(remaining)} to go
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
