export const TRANSACTION_CATEGORIES = [
  'Food & Drink',
  'Transport',
  'Fuel / Gas',
  'Online Shopping',
  'Household Needs',
  'Utilities',
  'Internet & Mobile',
  'Subscriptions',
  'Health',
  'Insurance',
  'Education',
  'Entertainment',
  'Donations / Charity',
  'Taxes / Fees',
  'Loan / Debt',
  'Family / Gifts',
  'Pets',
  'Savings / Investment',
  'Salary / Income',
  'Transfer',
  'Other'
] as const;

export type TransactionCategory = (typeof TRANSACTION_CATEGORIES)[number];

export const TRANSACTION_SOURCES = ['cash', 'bank', 'ewallet', 'unknown'] as const;
export type TransactionSource = (typeof TRANSACTION_SOURCES)[number];

export const TRANSACTION_DIRECTIONS = ['expense', 'income', 'transfer'] as const;
export type TransactionDirection = (typeof TRANSACTION_DIRECTIONS)[number];

export const AI_VERSION = 'v1.0.0';
