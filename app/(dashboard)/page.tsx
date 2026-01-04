import ChatInput from '@/components/chat-input';
import DashboardSummary from '@/components/dashboard-summary';
import CategoryChart from '@/components/charts/category-chart';
import SpendingTrend from '@/components/charts/spending-trend';
import RecentTransactions from '@/components/recent-transactions';
import TopExpenses from '@/components/top-expenses';

export default function OverviewPage() {
  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-2">
        <ChatInput />
        <DashboardSummary />
      </div>
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
  );
}
