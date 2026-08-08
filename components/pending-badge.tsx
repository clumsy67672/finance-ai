'use client';

import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';

type QueueCountResponse = {
  PENDING: number;
  PROCESSING: number;
  PROCESSED: number;
  ERROR: number;
};

export default function PendingBadge() {
  const [dismissed, setDismissed] = useState(false);

  const { data } = useSWR<QueueCountResponse>('/api/queue/count', {
    refreshInterval: 30_000
  });

  const count = data?.PENDING ?? 0;

  if (count <= 0 || dismissed) return null;

  return (
    <div className="flex w-full items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3">
      <Link
        href="/transactions"
        className="flex min-w-0 items-center gap-2 text-sm font-medium text-amber-800 hover:underline"
      >
        <span aria-hidden="true">⚠</span>
        <span className="truncate">
          {count} {count === 1 ? 'entry' : 'entries'} waiting to be processed
        </span>
      </Link>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="shrink-0 rounded-full p-1 text-amber-700 transition-colors hover:bg-amber-200"
        aria-label="Dismiss"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}