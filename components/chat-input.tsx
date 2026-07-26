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

type Mode = 'sync' | 'queue';

export default function ChatInput() {
  const { mutate } = useSWRConfig();
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<Mode>('sync');

  const saveMessage = async () => {
    if (!message.trim()) return;
    setLoading(true);
    setStatus(null);
    try {
      const endpoint = mode === 'queue' ? '/api/queue' : '/api/transactions';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      setMessage('');
      if (mode === 'queue') {
        setStatus('Saved to queue — will be processed when workstation is online');
        mutate('/api/queue/count');
      } else {
        setStatus('Saved');
        REFRESH_KEYS.forEach((key) => mutate(key));
      }
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

  const toggleMode = () => {
    setMode((prev) => (prev === 'sync' ? 'queue' : 'sync'));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-600">Chat input</label>
        <button
          type="button"
          onClick={toggleMode}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            mode === 'queue' ? 'bg-amber-500' : 'bg-slate-700'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              mode === 'queue' ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
          <span
            className={`absolute text-[10px] font-semibold uppercase tracking-wider ${
              mode === 'queue' ? 'left-1.5 text-white' : 'right-1.5 text-white'
            }`}
          >
            {mode === 'queue' ? 'Q' : 'S'}
          </span>
        </button>
      </div>
      <div>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={mode === 'queue' ? 'teh 10k (masuk antrean)' : 'kopi 18k'}
          className="mt-2 h-24 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-lg focus:border-slate-900 focus:bg-white focus:outline-none"
        />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-medium uppercase tracking-wider ${
              mode === 'queue' ? 'text-amber-600' : 'text-slate-400'
            }`}
          >
            {mode === 'queue' ? 'Queue mode' : 'Sync mode'}
          </span>
          {mode === 'queue' && (
            <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              pending
            </span>
          )}
        </div>
        <button
          type="submit"
          className="rounded-full bg-slate-900 px-6 py-2 text-sm font-semibold text-white disabled:opacity-60"
          disabled={loading}
        >
          {loading ? 'Parsing…' : mode === 'queue' ? 'Queue' : 'Save'}
        </button>
      </div>
      {status && <p className="text-sm text-slate-600">{status}</p>}
    </form>
  );
}
