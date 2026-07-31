'use client';

import { useState } from 'react';
import useSWR from 'swr';

type Insight = {
  status_kesehatan: 'Sehat' | 'Waspada' | 'Kritis';
  analisa_utama: string;
  rekomendasi_aksi: string[];
};

const STYLES: Record<Insight['status_kesehatan'], { banner: string; badge: string; label: string }> = {
  Sehat: {
    banner: 'border-emerald-200 bg-emerald-50',
    badge: 'bg-emerald-600 text-white',
    label: 'Sehat'
  },
  Waspada: {
    banner: 'border-amber-200 bg-amber-50',
    badge: 'bg-amber-500 text-white',
    label: 'Waspada'
  },
  Kritis: {
    banner: 'border-rose-200 bg-rose-50',
    badge: 'bg-rose-600 text-white',
    label: 'Kritis'
  }
};

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export default function InsightBanner() {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data, mutate } = useSWR<Insight & { cached?: boolean }>('/api/insights');

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const response = await fetch('/api/insights', { method: 'POST' });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Failed to generate insights');
      }
      const json = await response.json();
      await mutate(json, { revalidate: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setGenerating(false);
    }
  };

  if (!data || !data.status_kesehatan) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">AI Insight</p>
            <h2 className="text-lg font-semibold text-slate-900">Keuangan bulan ini</h2>
          </div>
          <button
            type="button"
            onClick={generate}
            disabled={generating}
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:opacity-60"
          >
            {generating ? <Spinner /> : null}
            {generating ? 'Generating...' : 'Generate Insights'}
          </button>
        </div>
        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
        <p className="mt-3 text-sm text-slate-500">
          {generating
            ? 'The local AI is analyzing your spending — this takes a few seconds.'
            : 'Generate a health check on your monthly spending.'}
        </p>
      </div>
    );
  }

  const style = STYLES[data.status_kesehatan] ?? STYLES.Waspada;

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${style.banner}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-3 py-0.5 text-xs font-semibold uppercase tracking-wide ${style.badge}`}>
            {style.label}
          </span>
          <p className="text-sm text-slate-500">AI Insight</p>
        </div>
        <button
          type="button"
          onClick={generate}
          disabled={generating}
          className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60"
        >
          {generating ? <Spinner /> : null}
          Regenerate
        </button>
      </div>
      <p className="mt-3 font-semibold text-slate-900">{data.analisa_utama}</p>
      {data.rekomendasi_aksi.length > 0 ? (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
          {data.rekomendasi_aksi.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
