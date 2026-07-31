export type TransactionResponse = {
  id: string;
  amount: number;
  direction: 'expense' | 'income' | 'transfer';
  occurredAt: string;
  category: string;
  cleanNote: string;
  merchant: string | null;
  source: 'cash' | 'bank' | 'ewallet' | 'unknown';
  tags: string[];
  aiConfidence: number;
  aiModel: string;
  aiVersion: string;
  rawMessage?: string;
  user?: {
    id: string;
    username: string;
  };
};

export type SummaryStats = {
  month: string;
  totalIncome: number;
  totalExpense: number;
  net: number;
  count: number;
  pacing?: {
    spent: number;
    income: number;
    expectedByToday: number;
    pacingPercent: number;
    overPace: boolean;
  };
};

export type CategoryBreakdown = {
  category: string;
  total: number;
};

export type TrendPoint = {
  date: string;
  income: number;
  expense: number;
};
