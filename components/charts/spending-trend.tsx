'use client';

import useSWR from 'swr';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';
import type { TrendPoint } from '@/types';
import { usePeriod } from '../period-context';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

export default function SpendingTrend() {
  const { period } = usePeriod();
  const { data } = useSWR<{ resolution: string; period: string; trend: TrendPoint[] }>(
    `/api/stats/trend?period=${period}`
  );
  const trend = data?.trend ?? [];

  if (!trend.length) {
    return <p className="text-sm text-slate-500">Add transactions to see your trend.</p>;
  }

  const chartData = {
    labels: trend.map((point) => point.date),
    datasets: [
      {
        label: 'Income',
        data: trend.map((point) => point.income),
        borderColor: '#16a34a',
        backgroundColor: 'rgba(22,163,74,0.3)',
        tension: 0.3,
        spanGaps: true,
      },
      {
        label: 'Expense',
        data: trend.map((point) => point.expense),
        borderColor: '#dc2626',
        backgroundColor: 'rgba(220,38,38,0.3)',
        tension: 0.3,
        spanGaps: true,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'bottom' as const },
    },
    scales: {
      y: { beginAtZero: true },
    },
  };

  return <Line data={chartData} options={options} className="max-h-80" />;
}
