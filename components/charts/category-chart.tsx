'use client';

import useSWR from 'swr';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement
} from 'chart.js';
import type { CategoryBreakdown } from '@/types';
import { usePeriod } from '../period-context';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement);

const COLORS = ['#0f172a', '#0284c7', '#22c55e', '#f97316', '#e11d48', '#a855f7', '#94a3b8'];

export default function CategoryChart() {
  const { period } = usePeriod();
  const { data } = useSWR<{ categories: CategoryBreakdown[] }>(`/api/stats/by-category?period=${period}`);
  const categories = data?.categories ?? [];

  if (!categories.length) {
    return <p className="text-sm text-slate-500">No expenses recorded yet.</p>;
  }

  const chartData = {
    labels: categories.map((cat) => cat.category),
    datasets: [
      {
        label: 'Expenses',
        data: categories.map((cat) => cat.total),
        backgroundColor: categories.map((_, index) => COLORS[index % COLORS.length])
      }
    ]
  };

  return <Pie data={chartData} className="max-h-72" />;
}
