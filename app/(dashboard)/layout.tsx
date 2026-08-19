import DashboardNav from '@/components/dashboard-nav';
import LogoutButton from '@/components/logout-button';
import BrandLogo from '@/components/brand-logo';
import ThemeToggle from '@/components/theme-toggle';
import RouteTransition from '@/components/route-transition';
import { requireUser } from '@/lib/auth';

const NAV_ITEMS: { href: string; label: string; roles?: Array<'admin' | 'member'> }[] = [
  { href: '/', label: 'Overview' },
  { href: '/transactions', label: 'Transactions' },
  { href: '/budgets', label: 'Budgets' },
  { href: '/goals', label: 'Goals' },
  { href: '/meal-prep', label: 'Meal Prep' }
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <BrandLogo />
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="text-right">
              <p className="text-sm font-medium text-slate-900">{user.username}</p>
              <p className="text-xs text-slate-600">{user.role}</p>
            </div>
            <LogoutButton />
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-6 pb-5">
          <DashboardNav items={NAV_ITEMS} role={user.role} />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <RouteTransition>{children}</RouteTransition>
      </main>
    </div>
  );
}
