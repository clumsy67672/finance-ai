import { startOfMonth, endOfMonth, startOfYear, endOfYear, format } from 'date-fns';

export type Period = 'payperiod' | 'month' | 'year' | 'all';

/**
 * Single source of truth for period ranges so the Summary, Pacing, Forecast
 * and Trend widgets all slice the same window.
 * - payperiod: 25th (prev month) -> 24th (this month), anchored to payday
 * - month: calendar month
 * - year: calendar year
 * - all: everything
 */
export function getPeriodRange(period: Period, now: Date = new Date()) {
  let rangeStart: Date;
  let rangeEnd: Date;
  let periodLabel: string;

  if (period === 'payperiod') {
    if (now.getDate() >= 25) {
      rangeStart = new Date(now.getFullYear(), now.getMonth(), 25);
      rangeEnd = new Date(now.getFullYear(), now.getMonth() + 1, 24, 23, 59, 59);
    } else {
      rangeStart = new Date(now.getFullYear(), now.getMonth() - 1, 25);
      rangeEnd = new Date(now.getFullYear(), now.getMonth(), 24, 23, 59, 59);
    }
    periodLabel = `${format(rangeStart, 'MMM d')} – ${format(rangeEnd, 'MMM d, yyyy')}`;
  } else if (period === 'month') {
    rangeStart = startOfMonth(now);
    rangeEnd = endOfMonth(now);
    periodLabel = format(rangeStart, 'MMMM yyyy');
  } else if (period === 'year') {
    rangeStart = startOfYear(now);
    rangeEnd = endOfYear(now);
    periodLabel = `Year ${now.getFullYear()}`;
  } else {
    rangeStart = new Date(2000, 0, 1);
    rangeEnd = now;
    periodLabel = 'All time';
  }

  return { rangeStart, rangeEnd, periodLabel };
}
