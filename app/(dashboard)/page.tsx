import ChatInput from '@/components/chat-input';
import DashboardSummary from '@/components/dashboard-summary';
import TodaySummary from '@/components/today-summary';
import InsightBanner from '@/components/insight-banner';
import MonthlyPacing from '@/components/monthly-pacing';
import NeedsWantsBar from '@/components/needs-wants-bar';
import RunwayForecast from '@/components/runway-forecast';
import BudgetProgress from '@/components/budget-progress';
import CategoryChart from '@/components/charts/category-chart';
import SpendingTrend from '@/components/charts/spending-trend';
import RecentTransactions from '@/components/recent-transactions';
import TopExpenses from '@/components/top-expenses';
import PendingBadge from '@/components/pending-badge';
import { DashboardProvider } from '@/components/period-context';

export default function OverviewPage() {
  return (
    <DashboardProvider>
    <div className="space-y-8">
      <PendingBadge />
      <div className="grid gap-6 lg:grid-cols-2">
        <ChatInput />
        <DashboardSummary />
      </div>
      <TodaySummary />
      <InsightBanner />
      <div className="grid gap-6 lg:grid-cols-2">
        <MonthlyPacing />
        <NeedsWantsBar />
      </div>
      <BudgetProgress />
      <RunwayForecast />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <p className="text-sm text-slate-500">Expense breakdown</p>
            <h2 className="text-lg font-semibold text-slate-900">By category</h2>
          </div>
          <CategoryChart />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <p className="text-sm text-slate-500">Trend</p>
            <h2 className="text-lg font-semibold text-slate-900">Income vs Expense</h2>
          </div>
          <SpendingTrend />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <RecentTransactions />
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <p className="text-sm text-slate-500">Largest spends</p>
            <h2 className="text-lg font-semibold text-slate-900">Top 10 expenses</h2>
          </div>
          <TopExpenses />
        </div>
      </div>
    </div>
    </DashboardProvider>
  );
}
