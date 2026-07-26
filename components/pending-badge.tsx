'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';

type QueueCountResponse = {
  PENDING: number;
  PROCESSING: number;
  PROCESSED: number;
  ERROR: number;
};

export default function PendingBadge() {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  const { data } = useSWR<QueueCountResponse>('/api/queue/count', {
    refreshInterval: 30_000
  });

  const count = data?.PENDING ?? 0;

  if (count <= 0 || dismissed) return null;

  return (
    <button
      type="button"
      onClick={() => router.push('/transactions')}
      className="flex w-full items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-left shadow-sm transition-colors hover:bg-amber-100"
    >
      <span className="flex items-center gap-2 text-sm font-medium text-amber-800">
        <span>📋</span>
        <span>
          {count} pending entr{count === 1 ? 'y' : 'ies'} — menunggu diproses worker
        </span>
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setDismissed(true);
        }}
        className="ml-4 rounded-full p-1 text-amber-500 transition-colors hover:bg-amber-200 hover:text-amber-700"
        aria-label="Dismiss"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </button>
  );
}
