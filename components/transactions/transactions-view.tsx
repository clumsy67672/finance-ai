'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { format } from 'date-fns';
import type { TransactionResponse } from '@/types';
import { TRANSACTION_CATEGORIES } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils';

type Props = {
  role: 'admin' | 'member';
  initialFilters?: Partial<FilterState>;
};

export type RangeFilter = 'month' | 'year' | 'lifetime';

export type FilterState = {
  range: RangeFilter;
  month: string;
  year: string;
  category: string;
  direction: string;
  userId: string;
};

function formatMonth(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

const defaultFilterState: FilterState = {
  range: 'month',
  month: formatMonth(new Date()),
  year: String(new Date().getFullYear()),
  category: '',
  direction: '',
  userId: ''
};

function mergeInitialFilters(initial?: Partial<FilterState>): FilterState {
  if (!initial) return defaultFilterState;
  return {
    ...defaultFilterState,
    ...initial
  };
}

export default function TransactionsView({ role, initialFilters }: Props) {
  const [filters, setFilters] = useState<FilterState>(() => mergeInitialFilters(initialFilters));
  const [editingId, setEditingId] = useState<string | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set('limit', '200');
    params.set('range', filters.range);
    if (filters.range === 'month' && filters.month) {
      params.set('month', filters.month);
    }
    if (filters.range === 'year' && filters.year) {
      params.set('year', filters.year);
    }
    if (filters.category) params.set('category', filters.category);
    if (filters.direction) params.set('direction', filters.direction);
    if (filters.userId) params.set('userId', filters.userId);
    return `/api/transactions?${params.toString()}`;
  }, [filters]);

  const { data, mutate } = useSWR<{ transactions: TransactionResponse[] }>(query);
  const transactions = data?.transactions ?? [];
  const { data: usersResponse } = useSWR<{ users: Array<{ id: string; username: string }> }>(
    role === 'admin' ? '/api/users' : null
  );
  const users = usersResponse?.users ?? [];

  const [formValues, setFormValues] = useState({
    occurredAt: '',
    amount: '',
    category: '',
    cleanNote: ''
  });

  const startEdit = (transaction: TransactionResponse) => {
    setEditingId(transaction.id);
    setFormValues({
      occurredAt: transaction.occurredAt.split('T')[0],
      amount: String(transaction.amount),
      category: transaction.category,
      cleanNote: transaction.cleanNote
    });
  };

  const submitEdit = async () => {
    if (!editingId) return;
    const amount = Number(formValues.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      alert('Amount must be a positive number');
      return;
    }
    await fetch(`/api/transactions/${editingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        occurredAt: formValues.occurredAt,
        amount,
        category: formValues.category,
        cleanNote: formValues.cleanNote
      })
    });
    setEditingId(null);
    mutate();
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Filters</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm text-slate-600">
            Range
            <select
              value={filters.range}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, range: event.target.value as RangeFilter }))
              }
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            >
              <option value="month">This month</option>
              <option value="year">Entire year</option>
              <option value="lifetime">Lifetime</option>
            </select>
          </label>
          {filters.range === 'month' && (
            <label className="text-sm text-slate-600">
              Month
              <input
                type="month"
                value={filters.month}
                onChange={(event) => setFilters((prev) => ({ ...prev, month: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              />
            </label>
          )}
          {filters.range === 'year' && (
            <label className="text-sm text-slate-600">
              Year
              <input
                type="number"
                min="2000"
                max="2100"
                value={filters.year}
                onChange={(event) => setFilters((prev) => ({ ...prev, year: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                placeholder="2025"
              />
            </label>
          )}
          <label className="text-sm text-slate-600">
            Category
            <select
              value={filters.category}
              onChange={(event) => setFilters((prev) => ({ ...prev, category: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            >
              <option value="">All</option>
              {TRANSACTION_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-600">
            Type
            <select
              value={filters.direction}
              onChange={(event) => setFilters((prev) => ({ ...prev, direction: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            >
              <option value="">All</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
              <option value="transfer">Transfer</option>
            </select>
          </label>
          {role === 'admin' && (
            <label className="text-sm text-slate-600">
              User
              <select
                value={filters.userId}
                onChange={(event) => setFilters((prev) => ({ ...prev, userId: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              >
                <option value="">All users</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.username}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Transactions</h2>
          <p className="text-sm text-slate-500">{transactions.length} rows</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="p-2">Date</th>
                <th className="p-2">Note</th>
                <th className="p-2">Category</th>
                <th className="p-2">Amount</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="border-t border-slate-100">
                  <td className="p-2 text-slate-600">
                    {editingId === transaction.id ? (
                      <input
                        type="date"
                        value={formValues.occurredAt}
                        onChange={(event) => setFormValues((prev) => ({ ...prev, occurredAt: event.target.value }))}
                        className="rounded-lg border border-slate-200 px-2 py-1"
                      />
                    ) : (
                      format(new Date(transaction.occurredAt), 'dd MMM yyyy')
                    )}
                  </td>
                  <td className="p-2">
                    {editingId === transaction.id ? (
                      <input
                        value={formValues.cleanNote}
                        onChange={(event) => setFormValues((prev) => ({ ...prev, cleanNote: event.target.value }))}
                        className="w-full rounded-lg border border-slate-200 px-2 py-1"
                      />
                    ) : (
                      <span className="font-medium text-slate-900">{transaction.cleanNote}</span>
                    )}
                  </td>
                  <td className="p-2">
                    {editingId === transaction.id ? (
                      <select
                        value={formValues.category}
                        onChange={(event) => setFormValues((prev) => ({ ...prev, category: event.target.value }))}
                        className="rounded-lg border border-slate-200 px-2 py-1"
                      >
                        {TRANSACTION_CATEGORIES.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span>{transaction.category}</span>
                    )}
                  </td>
                  <td className="p-2 font-semibold">
                    {editingId === transaction.id ? (
                      <input
                        type="number"
                        value={formValues.amount}
                        onChange={(event) => setFormValues((prev) => ({ ...prev, amount: event.target.value }))}
                        className="w-32 rounded-lg border border-slate-200 px-2 py-1"
                      />
                    ) : (
                      <span className={transaction.direction === 'income' ? 'text-emerald-600' : 'text-rose-600'}>
                        {transaction.direction === 'income' ? '+' : '-'}
                        {formatCurrency(transaction.amount)}
                      </span>
                    )}
                  </td>
                  <td className="p-2 text-right">
                    {editingId === transaction.id ? (
                      <div className="flex gap-2">
                        <button
                          onClick={submitEdit}
                          className="rounded-full bg-slate-900 px-3 py-1 text-white"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="rounded-full border border-slate-200 px-3 py-1"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit(transaction)}
                        className="rounded-full border border-slate-200 px-3 py-1"
                      >
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
