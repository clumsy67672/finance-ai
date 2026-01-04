'use client';

import { FormEvent, KeyboardEvent, useState } from 'react';
import { useSWRConfig } from 'swr';

const REFRESH_KEYS = [
  '/api/transactions?limit=20',
  '/api/stats/summary',
  '/api/stats/by-category',
  '/api/stats/trend',
  '/api/stats/top-expenses'
];

export default function ChatInput() {
  const { mutate } = useSWRConfig();
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const saveMessage = async () => {
    if (!message.trim()) return;
    setLoading(true);
    setStatus(null);
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      setMessage('');
      setStatus('Saved');
      REFRESH_KEYS.forEach((key) => mutate(key));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void saveMessage();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !loading) {
      event.preventDefault();
      void saveMessage();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <label className="text-sm font-medium text-slate-600">Chat input</label>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="kopi 18k"
          className="mt-2 h-24 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-lg focus:border-slate-900 focus:bg-white focus:outline-none"
        />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Enter transactions like &quot;shopee 250k mouse&quot;.</p>
        <button
          type="submit"
          className="rounded-full bg-slate-900 px-6 py-2 text-sm font-semibold text-white disabled:opacity-60"
          disabled={loading}
        >
          {loading ? 'Parsing…' : 'Save'}
        </button>
      </div>
      {status && <p className="text-sm text-slate-600">{status}</p>}
    </form>
  );
}
