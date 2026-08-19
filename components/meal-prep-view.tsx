'use client';

import { useState } from 'react';

type ShoppingItem = {
  name: string;
  qty: number;
  unit: string;
  price: number; // harga basis untuk 4 orang
  discrete?: boolean; // botol/pack/paket -> minimal 1
};

const SHOPPING: ShoppingItem[] = [
  { name: 'Beras Rojolele', qty: 10, unit: 'kg', price: 60000 },
  { name: 'Ayam potong', qty: 3, unit: 'kg', price: 135000 },
  { name: 'Telur', qty: 20, unit: 'butir', price: 36000 },
  { name: 'Tempe', qty: 3, unit: 'pack', price: 36000, discrete: true },
  { name: 'Tahu', qty: 2, unit: 'pack', price: 10000, discrete: true },
  { name: 'Kangkung', qty: 6, unit: 'ikat', price: 12000 },
  { name: 'Sayur asem (melinjo, jagung, kacang)', qty: 1, unit: 'kg', price: 14000 },
  { name: 'Daging cincang (sapi/kambing)', qty: 1, unit: 'kg', price: 90000 },
  { name: 'Kacang tanah', qty: 250, unit: 'g', price: 10000 },
  { name: 'Kecap manis', qty: 1, unit: 'botol', price: 8000, discrete: true },
  { name: 'Bumbu (bawang, cabai, kunyit, jeruk)', qty: 1, unit: 'paket', price: 20000, discrete: true },
  { name: 'Kerupuk', qty: 1, unit: 'pack', price: 15000, discrete: true },
  { name: 'Susu cair + oat (smoothie)', qty: 1, unit: 'paket', price: 20000, discrete: true }
];

const TOOLS = [
  { name: 'Air fryer', replaces: 'Menggoreng deep-fry', use: 'Ayam, tahu, tempe, kerupuk — semua 0 minyak' },
  { name: 'Blender', replaces: 'Ulek + tumis pakai minyak', use: 'Bumbu halus, sambal segar, saus kacang, smoothie' },
  { name: 'Kulkas / freezer', replaces: '—', use: 'Simpan hasil batch; bekukan sisa ayam / tempe' },
  { name: 'Panci / rice cooker', replaces: '—', use: 'Nasi, rebus telur, sayur asem, gado-gado' }
];

const DAYS = [
  { day: 'Senin', meal: 'Nasi + ayam air fryer + kangkung' },
  { day: 'Selasa', meal: 'Nasi + ayam (cairkan dari freezer) + kangkung' },
  { day: 'Rabu', meal: 'Nasi + ayam + kangkung' },
  { day: 'Kamis', meal: 'Nasi + telur sambal + tempe kecap + sayur asem (rebus, tanpa minyak)' },
  { day: 'Jumat', meal: 'Nasi + telur + tempe + sayur asem' },
  { day: 'Sabtu', meal: 'Nasi + bola daging cincang air fryer + tahu + kerupuk' },
  { day: 'Minggu', meal: 'Nasi + gado-gado (sayur rebus + saus kacang) + sisa daging' }
];

const SUNDAY_STEPS = [
  'Nasi — masak 10 kg di rice cooker (cadangan 3–4 hari), dinginkan separuh.',
  'Bumbu halus (blender) — haluskan bawang merah + bawang putih + kunyit + cabai + sedikit air. Bagi dua: satu marinasi ayam, satu sambal mentah (tomat + jeruk nipis, tidak dimasak).',
  'Ayam (rebus lalu air fryer) — rebus 3 kg ayam dengan air + separuh bumbu + kecap sampai empuk (±30 mnt). Air fryer 180 °C, 12–15 mnt agar kulit garing. 0 minyak. Bekukan separuh.',
  'Telur — rebus 20 butir; 10 di antaranya jadi telur sambal (aduk telur rebus dengan sambal blender mentah), tahan 3 hari.',
  'Tempe — iris, air fryer 160 °C 10 mnt hingga garing; oles kecap (tanpa minyak) ala bacem. Tahan 4 hari.',
  'Tahu — air fryer 180 °C 12 mnt hingga keemasan luar, lembut dalam.',
  'Saus kacang (blender) — air fryer kacang 160 °C 5 mnt, haluskan dengan bawang putih + cabai + jeruk nipis + air.',
  'Kerupuk — air fryer 5 mnt (mengembang 0 minyak).',
  'Kangkung — blansir cepat; aduk segar tiap pagi (tanpa minyak).'
];

const WEDNESDAY_STEPS = [
  'Masak ulang nasi.',
  'Segarkan kangkung.',
  'Cairkan + air fryer bagian ayam dari freezer.'
];

const CHECKLIST = [
  'Masak nasi dalam porsi besar; bagi 2 wadah agar satu dibekukan.',
  'Simpan ayam ungkep di sirup bumbunya sendiri — base rasa, jangan dibuang.',
  'Aduk kangkung segar tiap pagi agar tidak layu saat makan siang.',
  'Tempe bacem bisa jadi teman nasi pagi — lebih murah & sehat dari roti / mi instan.',
  'Backup hari malas: siang nasi + telur rebus + sambal + kerupuk (~Rp8.000/kepala vs Rp25.000 warung); malam mi instan + telur + sayur beku (~Rp12.000 vs Rp45.000).'
];

const idr = (n: number) =>
  'Rp' + new Intl.NumberFormat('id-ID').format(Math.round(n / 1000) * 1000).replace(/000$/, '000');

export default function MealPrepView() {
  const [size, setSize] = useState<3 | 4>(4);
  const factor = size === 4 ? 1 : 0.75;

  const scaledQty = (item: ShoppingItem) => {
    const q = item.qty * factor;
    if (item.discrete) return Math.max(1, Math.round(q)).toString();
    return (Math.round(q * 10) / 10).toString();
  };

  const total = SHOPPING.reduce((s, item) => s + item.price * factor, 0);

  // Tabungan vs makan luar (basis per orang/hari dikalikan jumlah orang)
  const eatOutConservative = size * 30000 * 30; // 1x luar/orang/hari @ ~Rp30k
  const eatOutAggressive = size * 60000 * 30; // 2x luar/orang/hari @ ~Rp60k
  const planMonthly = size * 500000; // ~Rp500k/kepala/bulan
  const savedConservative = eatOutConservative - planMonthly;
  const savedAggressive = eatOutAggressive - planMonthly;

  return (
    <div className="space-y-6">
      {/* Header + toggle */}
      <div className="card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Rencana Meal Prep</h1>
            <p className="mt-1 text-sm text-slate-600">
              Tanpa minyak · Air fryer · Blender · Kulkas — untuk rumah tangga {size} orang.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Jumlah orang:</span>
            <div className="flex rounded-lg border border-slate-200 p-0.5">
              {([3, 4] as const).map((n) => (
                <button
                  key={n}
                  onClick={() => setSize(n)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    size === n ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {n} orang
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Cara alat */}
      <div className="card">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Cara Alat Menggantikan Minyak</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TOOLS.map((t) => (
            <div key={t.name} className="rounded-lg border border-slate-200 p-3">
              <p className="font-medium text-slate-900">{t.name}</p>
              <p className="mt-0.5 text-xs text-slate-500">Ganti: {t.replaces}</p>
              <p className="mt-2 text-sm text-slate-700">{t.use}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Daftar belanja */}
      <div className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Daftar Belanja</h2>
          <span className="rounded-full bg-emerald-100 px-3 py-0.5 text-sm font-semibold text-emerald-800">
            {idr(total)} / minggu
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                <th className="py-2 pr-2">Bahan</th>
                <th className="py-2 pr-2">Jumlah</th>
                <th className="py-2 pr-2">Harga</th>
              </tr>
            </thead>
            <tbody>
              {SHOPPING.map((item) => (
                <tr key={item.name} className="border-b border-slate-100">
                  <td className="py-2 pr-2 text-slate-900">{item.name}</td>
                  <td className="py-2 pr-2 text-slate-700">
                    {scaledQty(item)} {item.unit}
                  </td>
                  <td className="py-2 pr-2 text-slate-700">{idr(item.price * factor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Tidak ada minyak goreng dibeli. Per kepala sekitar {idr(total / size)} / minggu.
        </p>
      </div>

      {/* Jadwal masak */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Jadwal Masak — Minggu (±3 jam)</h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-700">
            {SUNDAY_STEPS.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </div>
        <div className="card">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Top-up — Rabu (±1 jam)</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
            {WEDNESDAY_STEPS.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
          <h3 className="mb-2 mt-5 text-base font-semibold text-slate-900">Sarapan (blender)</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>Smoothie pisang: pisang + susu cair + oat, blender 30 detik (~Rp4.000 vs Rp10.000 roti/mi instan).</li>
            <li>Atau nasi hangat + tempe kecap dari batch.</li>
          </ul>
        </div>
      </div>

      {/* Rencana per hari */}
      <div className="card">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Rencana per Hari</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {DAYS.map((d) => (
            <div key={d.day} className="rounded-lg border border-slate-200 p-3">
              <p className="font-medium text-slate-900">{d.day}</p>
              <p className="mt-1 text-sm text-slate-700">{d.meal}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabungan */}
      <div className="card">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Tabungan vs Makan di Luar</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                <th className="py-2 pr-2">Skenario</th>
                <th className="py-2 pr-2">Makan luar / bulan</th>
                <th className="py-2 pr-2">Rencana ini / bulan</th>
                <th className="py-2 pr-2">Hemat / bulan</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="py-2 pr-2 text-slate-900">Konservatif (1x luar/orang/hari)</td>
                <td className="py-2 pr-2 text-slate-700">{idr(eatOutConservative)}</td>
                <td className="py-2 pr-2 text-slate-700">{idr(planMonthly)}</td>
                <td className="py-2 pr-2 font-semibold text-emerald-600">{idr(savedConservative)}</td>
              </tr>
              <tr>
                <td className="py-2 pr-2 text-slate-900">Agresif (2x luar/orang/hari)</td>
                <td className="py-2 pr-2 text-slate-700">{idr(eatOutAggressive)}</td>
                <td className="py-2 pr-2 text-slate-700">{idr(planMonthly)}</td>
                <td className="py-2 pr-2 font-semibold text-emerald-600">{idr(savedAggressive)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Checklist */}
      <div className="card">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Checklist Persiapan</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
          {CHECKLIST.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
