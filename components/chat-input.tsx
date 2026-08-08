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
type Status = { text: string; kind: 'success' | 'error' } | null;

export default function ChatInput() {
  const { mutate } = useSWRConfig();
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<Status>(null);
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
        setStatus({
          text: 'Queued offline — will be saved when the workstation is online.',
          kind: 'success'
        });
        mutate('/api/queue/count');
      } else {
        setStatus({ text: 'Saved', kind: 'success' });
        REFRESH_KEYS.forEach((key) => mutate(key));
      }
    } catch (error) {
      setStatus({
        text: error instanceof Error ? error.message : 'Could not save.',
        kind: 'error'
      });
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

  const isQueue = mode === 'queue';

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-slate-700" htmlFor="chat-entry">
          {isQueue ? 'Offline entry (queued)' : 'Add an entry'}
        </label>
        <button
          type="button"
          onClick={toggleMode}
          aria-pressed={isQueue}
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 hover:text-slate-900"
        >
          <span
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              isQueue ? 'bg-amber-500' : 'bg-slate-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isQueue ? 'translate-x-[18px]' : 'translate-x-1'
              }`}
            />
          </span>
          {isQueue ? 'Queue on' : 'Sync on'} · switch to {isQueue ? 'sync' : 'queue'}
        </button>
      </div>
      <div>
        <textarea
          id="chat-input"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isQueue ? 'teh 10k — saved offline' : 'kopi 18k'}
          className="mt-2 h-24 w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-lg placeholder:text-slate-500 focus:border-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
        />
        <p className="mt-1.5 text-xs text-slate-500">
          {isQueue
            ? 'Saves here and posts once the workstation reconnects.'
            : 'Press Enter to save. Shift+Enter for a new line.'}
        </p>
      </div>
      <div className="flex items-center justify-between">
        {isQueue && (
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
            offline queue
          </span>
        )}
        <button type="submit" className="btn btn-primary ml-auto px-6 py-2" disabled={loading}>
          {loading ? 'Parsing…' : isQueue ? 'Queue' : 'Save'}
        </button>
      </div>
      {status && (
        <p className={status.kind === 'error' ? 'text-sm text-rose-600' : 'text-sm text-slate-600'}>
          {status.text}
        </p>
      )}
    </form>
  );
}