import { DashboardProvider } from '@/components/period-context';
import FinancialSnapshot from '@/components/financial-snapshot';
import GoalsList from '@/components/goals-list';
import ChallengesList from '@/components/challenges-list';

export default function GoalsPage() {
  return (
    <DashboardProvider>
      <div className="space-y-6">
        <FinancialSnapshot />
        <div className="grid gap-6 lg:grid-cols-2">
          <GoalsList />
          <ChallengesList />
        </div>
      </div>
    </DashboardProvider>
  );
}
