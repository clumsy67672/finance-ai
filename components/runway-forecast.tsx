'use client';

import useSWR from 'swr';
import { formatCurrency } from '@/lib/utils';
import { usePeriod } from './period-context';

type Forecast = {
  periodLabel: string;
  budget: number;
  pengeluaran_saat_ini: number;
  proyeksi_matematis: number;
  estimasi_pengeluaran_akhir: number;
  status_proyeksi: 'Safe' | 'Warning' | 'Deficit';
  pesan_prediksi: string;
  pola_rutin_terdeteksi: string[];
};

const STYLES: Record<Forecast['status_proyeksi'], { banner: string; badge: string; label: string }> = {
  Safe: { banner: 'border-emerald-200 bg-emerald-50', badge: 'bg-emerald-600 text-white', label: 'Safe' },
  Warning: { banner: 'border-amber-200 bg-amber-50', badge: 'bg-amber-500 text-white', label: 'Warning' },
  Deficit: { banner: 'border-rose-200 bg-rose-50', badge: 'bg-rose-600 text-white', label: 'Deficit' },
};

export default function RunwayForecast() {
  const { period } = usePeriod();
  const { data } = useSWR<Forecast>(`/api/stats/forecast?period=${period}`);

  if (!data) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-500">Runway & forecast</p>
        <h2 className="text-lg font-semibold text-slate-900">Spending forecast</h2>
        <p className="mt-3 text-sm text-slate-500">Loading...</p>
      </div>
    );
  }

  const style =
    STYLES[data.status_proyeksi] ??
    STYLES[
      String(data.status_proyeksi) === 'Aman'
        ? 'Safe'
        : String(data.status_proyeksi) === 'Defisit'
          ? 'Deficit'
          : 'Warning'
    ] ??
    STYLES.Warning;

  const budget = Math.max(data.budget, 0);
  const scale = Math.max(budget, data.pengeluaran_saat_ini, data.estimasi_pengeluaran_akhir, 1);
  const spentPct = (data.pengeluaran_saat_ini / scale) * 100;
  const projectedPct = (data.estimasi_pengeluaran_akhir / scale) * 100;
  // Where the real budget line sits, relative to the same scale
  const budgetPct = (budget / scale) * 100;

  const budgetLeft = budget - data.estimasi_pengeluaran_akhir;

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${style.banner}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">Runway & forecast · {data.periodLabel}</p>
          <h2 className="text-lg font-semibold text-slate-900">Spending forecast</h2>
        </div>
        <span className={`rounded-full px-3 py-0.5 text-xs font-semibold uppercase tracking-wide ${style.badge}`}>
          {style.label}
        </span>
      </div>

      {/* Bar: filled = spent, dashed = projected, vertical red line = budget (income) */}
      <div className="relative mt-4 h-3 w-full rounded-full bg-white/60">
        <div className="absolute inset-y-0 left-0 rounded-full bg-slate-900" style={{ width: `${spentPct}%` }} />
        <div
          className="absolute inset-y-0 left-0 rounded-full border-2 border-dashed border-rose-400"
          style={{ width: `${projectedPct}%` }}
        />
        {/* Budget line at 100% of income — thicker for visibility */}
        <div
          className="absolute inset-y-0 z-10 w-[3px] rounded-full bg-red-600 ring-1 ring-white"
          style={{ left: `${Math.min(budgetPct, 100)}%` }}
          title={`Budget (income): ${formatCurrency(budget)}`}
        />
      </div>

      {/* Legend + percentages */}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-slate-900" />
          Spent {Math.round(spentPct)}%
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm border-2 border-dashed border-rose-400" />
          Projected {Math.round(projectedPct)}%
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-0.5 bg-red-500" />
          Budget {formatCurrency(budget)}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
        <div>
          <p className="text-xs text-slate-500">Spent so far</p>
          <p className="font-semibold text-slate-900">{formatCurrency(data.pengeluaran_saat_ini)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Math projection</p>
          <p className="font-semibold text-slate-700">{formatCurrency(data.proyeksi_matematis)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">AI estimate</p>
          <p className="font-semibold text-slate-900">{formatCurrency(data.estimasi_pengeluaran_akhir)}</p>
        </div>
      </div>

      {/* Budget left readout */}
      <div className={`mt-3 rounded-xl px-3 py-2 text-sm font-medium ${budgetLeft >= 0 ? 'bg-white/70 text-emerald-700' : 'bg-white/70 text-rose-700'}`}>
        {budgetLeft >= 0
          ? `Budget left at period end: ${formatCurrency(budgetLeft)}`
          : `Over budget by ${formatCurrency(-budgetLeft)} — cut spending so funds last until payday`}
      </div>

      <p className={`mt-3 text-sm ${style.label === 'Safe' ? 'text-emerald-700' : style.label === 'Warning' ? 'text-amber-700' : 'text-rose-700'}`}>
        {data.pesan_prediksi}
      </p>

      {data.pola_rutin_terdeteksi.length > 0 ? (
        <ul className="mt-3 space-y-1 border-t border-slate-200/60 pt-3 text-xs text-slate-600">
          {data.pola_rutin_terdeteksi.map((pattern) => (
            <li key={pattern}>• {pattern}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
