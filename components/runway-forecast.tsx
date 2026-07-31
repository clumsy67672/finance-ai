'use client';

import useSWR from 'swr';
import { formatCurrency } from '@/lib/utils';

type Forecast = {
  bulan: string;
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
  Deficit: { banner: 'border-rose-200 bg-rose-50', badge: 'bg-rose-600 text-white', label: 'Deficit' }
};

export default function RunwayForecast() {
  const { data } = useSWR<Forecast>('/api/stats/forecast');

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
    STYLES[data.status_proyeksi === 'Aman' ? 'Safe' : data.status_proyeksi === 'Defisit' ? 'Deficit' : 'Warning'] ??
    STYLES.Warning;
  const budget = Math.max(data.estimasi_pengeluaran_akhir, data.pengeluaran_saat_ini, 1);
  const spentPct = Math.min((data.pengeluaran_saat_ini / budget) * 100, 100);
  const projectedPct = Math.min((data.estimasi_pengeluaran_akhir / budget) * 100, 100);

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${style.banner}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">Runway & forecast · {data.bulan}</p>
          <h2 className="text-lg font-semibold text-slate-900">Spending forecast</h2>
        </div>
        <span className={`rounded-full px-3 py-0.5 text-xs font-semibold uppercase tracking-wide ${style.badge}`}>
          {style.label}
        </span>
      </div>

      {/* Runway bar: filled = spent, dotted = projected, red line = budget */}
      <div className="relative mt-4 h-3 w-full rounded-full bg-white/60">
        <div className="absolute inset-y-0 left-0 rounded-full bg-slate-900" style={{ width: `${spentPct}%` }} />
        <div
          className="absolute inset-y-0 left-0 rounded-full border-2 border-dashed border-rose-400"
          style={{ width: `${projectedPct}%` }}
        />
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
