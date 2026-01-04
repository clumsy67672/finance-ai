import { TransactionDirection } from '@/lib/constants';

const AMOUNT_REGEX = /(?:(?:rp|idr|usd|\$)\s*)?(-?\d+[\d.,]*)\s*(k|rb|ribu|jt|juta|m)?/i;

const multiplierMap: Record<string, number> = {
  k: 1000,
  rb: 1000,
  ribu: 1000,
  jt: 1000000,
  juta: 1000000,
  m: 1000000
};

function parseNumericPortion(raw: string): number {
  const trimmed = raw.trim();
  const commaAsDecimal = trimmed.includes(',') && !trimmed.includes('.');
  const normalized = commaAsDecimal ? trimmed.replace(/,/g, '.') : trimmed;
  const parts = normalized.split('.');

  if (parts.length === 2 && parts[1].length <= 2) {
    const decimalValue = Number(`${parts[0]}.${parts[1]}`);
    if (!Number.isNaN(decimalValue)) {
      return decimalValue;
    }
  }

  const stripped = normalized.replace(/[.,\s]/g, '');
  const asInt = Number(stripped);
  if (Number.isNaN(asInt)) {
    throw new Error('Unable to parse amount');
  }
  return asInt;
}

function tidyNoteText(note: string, fallback: string): string {
  let normalized = note.replace(/\s+/g, ' ').trim();
  normalized = normalized.replace(/[:\-–]+\s*$/g, '').trim();
  if (!normalized) {
    return fallback.trim();
  }
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function detectDirection(message: string): TransactionDirection {
  const lower = message.toLowerCase();
  if (/(salary|gaji|bonus|pay|income)/i.test(lower)) {
    return 'income';
  }
  if (/(transfer|tf|kirim)/i.test(lower)) {
    return 'transfer';
  }
  return 'expense';
}

export function parseChatMessage(message: string): {
  amount: number;
  cleanNote: string;
  direction: TransactionDirection;
} {
  const amountMatch = message.match(AMOUNT_REGEX);
  if (!amountMatch) {
    throw new Error('Unable to detect amount in message');
  }
  const [, value, maybeSuffix] = amountMatch;
  const numeric = parseNumericPortion(value);
  const multiplier = maybeSuffix ? multiplierMap[maybeSuffix.toLowerCase()] ?? 1 : 1;
  const amount = Math.round(numeric * multiplier);
  const cleaned = tidyNoteText(message.replace(amountMatch[0], ''), message);

  return {
    amount,
    cleanNote: cleaned,
    direction: detectDirection(message)
  };
}

export function parseAmountField(value: string | number): { amount: number; negative: boolean } {
  if (typeof value === 'number') {
    return { amount: Math.round(Math.abs(value)), negative: value < 0 };
  }
  const text = value.toString().trim().toLowerCase();
  if (!text) {
    throw new Error('Amount missing');
  }
  const match = text.match(/(?:(?:rp|idr|usd|\$)\s*)?(-?\d+[\d.,]*)\s*(k|rb|ribu|jt|juta|m)?/i);
  if (!match) {
    throw new Error('Invalid amount format');
  }
  const [, rawValue, maybeSuffix] = match;
  const negative = rawValue.startsWith('-');
  const numeric = parseNumericPortion(rawValue.replace('-', ''));
  const multiplier = maybeSuffix ? multiplierMap[maybeSuffix.toLowerCase()] ?? 1 : 1;
  const amount = Math.round(numeric * multiplier);
  return { amount, negative };
}

export function deriveDirectionFromContext(options: {
  explicitType?: string | null;
  description: string;
  isNegative?: boolean;
}): TransactionDirection {
  const { explicitType, description, isNegative } = options;
  if (explicitType) {
    const normalized = explicitType.toLowerCase();
    if (/(income|salary|gaji|bonus|topup|deposit)/i.test(normalized)) {
      return 'income';
    }
    if (/(transfer|tf)/i.test(normalized)) {
      return 'transfer';
    }
    if (/(expense|spend|payment|bayar|belanja|charge)/i.test(normalized)) {
      return 'expense';
    }
  }
  if (isNegative) {
    return 'expense';
  }
  return detectDirection(description);
}
