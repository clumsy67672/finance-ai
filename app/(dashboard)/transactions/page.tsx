import { requireUser } from '@/lib/auth';
import TransactionsView, { type FilterState } from '@/components/transactions/transactions-view';

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

function getParam(value?: string | string[]): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function resolveInitialFilters(searchParams?: PageProps['searchParams']): Partial<FilterState> {
  if (!searchParams) return {};
  const initial: Partial<FilterState> = {};
  const rangeParam = getParam(searchParams.range);
  if (rangeParam === 'month' || rangeParam === 'year' || rangeParam === 'lifetime') {
    initial.range = rangeParam;
  }

  const monthParam = getParam(searchParams.month);
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    initial.month = monthParam;
  }

  const yearParam = getParam(searchParams.year);
  if (yearParam && /^\d{4}$/.test(yearParam)) {
    initial.year = yearParam;
  }

  const directionParam = getParam(searchParams.direction);
  if (directionParam && ['income', 'expense', 'transfer'].includes(directionParam)) {
    initial.direction = directionParam as FilterState['direction'];
  }

  const categoryParam = getParam(searchParams.category);
  if (categoryParam) {
    initial.category = categoryParam;
  }

  const userParam = getParam(searchParams.userId);
  if (userParam) {
    initial.userId = userParam;
  }

  return initial;
}

export default async function TransactionsPage({ searchParams }: PageProps) {
  const user = await requireUser();
  const initialFilters = resolveInitialFilters(searchParams);
  return <TransactionsView role={user.role} initialFilters={initialFilters} />;
}
