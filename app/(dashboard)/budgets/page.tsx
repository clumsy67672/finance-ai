import { DashboardProvider } from '@/components/period-context';
import RecurringList from '@/components/recurring-list';
import BudgetSetter from '@/components/budget-setter';
import BudgetProgress from '@/components/budget-progress';

export default function BudgetsPage() {
  return (
    <DashboardProvider>
      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <BudgetSetter />
          <RecurringList />
        </div>
        <BudgetProgress />
      </div>
    </DashboardProvider>
  );
}
