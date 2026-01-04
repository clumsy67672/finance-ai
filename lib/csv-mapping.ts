import { inferCsvColumnsWithAI } from '@/lib/openai';

type MappingFields = 'amount' | 'description' | 'date' | 'type';

export type CsvMappingGuess = Partial<Record<MappingFields, string | null>>;

const KEYWORDS: Record<MappingFields, string[]> = {
  amount: ['amount', 'nominal', 'value', 'debit', 'credit', 'jumlah', 'price', 'total', 'nilai'],
  description: ['description', 'desc', 'note', 'memo', 'detail', 'remarks', 'keterangan', 'merchant', 'store', 'item'],
  date: ['date', 'tanggal', 'time', 'posted', 'created', 'updated'],
  type: ['type', 'direction', 'status', 'category', 'kind', 'flow']
};

const DIRECTION_KEYWORDS = ['income', 'expense', 'transfer', 'debit', 'credit', 'in', 'out', 'masuk', 'keluar'];

function normalizeValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : value !== null && value !== undefined ? String(value).trim() : '';
}

function sampleColumnValues(rows: Array<Record<string, string>>, column: string, limit = 8): string[] {
  const results: string[] = [];
  for (const row of rows) {
    if (results.length >= limit) break;
    const value = normalizeValue(row[column]);
    if (value) {
      results.push(value);
    }
  }
  return results;
}

function looksNumeric(value: string): boolean {
  return /[\d]/.test(value) && !/[a-z]/i.test(value.replace(/k|rb|ribu|jt|juta|m/gi, ''));
}

function looksDate(value: string): boolean {
  if (!value) return false;
  const parsed = Date.parse(value);
  return !Number.isNaN(parsed);
}

function looksDirection(value: string): boolean {
  const lower = value.toLowerCase();
  return DIRECTION_KEYWORDS.some((keyword) => lower.includes(keyword));
}

function pickByKeyword(columns: string[], field: MappingFields): string | null {
  const keywords = KEYWORDS[field];
  const lowerColumns = columns.map((name) => name.toLowerCase());
  for (let index = 0; index < lowerColumns.length; index += 1) {
    const name = lowerColumns[index];
    if (keywords.some((keyword) => name.includes(keyword))) {
      return columns[index];
    }
  }
  return null;
}

function detectAmountColumn(columns: string[], rows: Array<Record<string, string>>): string | null {
  const keywordMatch = pickByKeyword(columns, 'amount');
  if (keywordMatch) return keywordMatch;
  let bestColumn: string | null = null;
  let bestScore = 0;
  for (const column of columns) {
    const values = sampleColumnValues(rows, column);
    if (!values.length) continue;
    const numericRatio = values.filter(looksNumeric).length / values.length;
    if (numericRatio > bestScore) {
      bestScore = numericRatio;
      bestColumn = column;
    }
  }
  return bestScore >= 0.5 ? bestColumn : null;
}

function detectDateColumn(columns: string[], rows: Array<Record<string, string>>): string | null {
  const keywordMatch = pickByKeyword(columns, 'date');
  if (keywordMatch) return keywordMatch;
  let bestColumn: string | null = null;
  let bestScore = 0;
  for (const column of columns) {
    const values = sampleColumnValues(rows, column);
    if (!values.length) continue;
    const dateRatio = values.filter(looksDate).length / values.length;
    if (dateRatio > bestScore) {
      bestScore = dateRatio;
      bestColumn = column;
    }
  }
  return bestScore >= 0.5 ? bestColumn : null;
}

function detectTypeColumn(columns: string[], rows: Array<Record<string, string>>): string | null {
  const keywordMatch = pickByKeyword(columns, 'type');
  if (keywordMatch) return keywordMatch;
  for (const column of columns) {
    const values = sampleColumnValues(rows, column);
    if (!values.length) continue;
    const hasDirection = values.some(looksDirection);
    if (hasDirection) {
      return column;
    }
  }
  return null;
}

function detectDescriptionColumn(
  columns: string[],
  rows: Array<Record<string, string>>,
  taken: Set<string>
): string | null {
  const candidates = columns.filter((column) => !taken.has(column));
  const keywordMatch = pickByKeyword(candidates, 'description');
  if (keywordMatch) return keywordMatch;
  for (const column of candidates) {
    const values = sampleColumnValues(rows, column);
    if (!values.length) continue;
    const textRatio = values.filter((value) => value.split(/\s+/).length >= 1).length / values.length;
    if (textRatio >= 0.4) {
      return column;
    }
  }
  return candidates[0] ?? null;
}

export function inferCsvMappingHeuristics(columns: string[], rows: Array<Record<string, string>>): CsvMappingGuess {
  const limitedRows = rows.slice(0, 10);
  const amount = detectAmountColumn(columns, limitedRows);
  const date = detectDateColumn(columns, limitedRows);
  const type = detectTypeColumn(columns, limitedRows);
  const taken = new Set<string>();
  if (amount) taken.add(amount);
  if (date) taken.add(date);
  if (type) taken.add(type);
  const description = detectDescriptionColumn(columns, limitedRows, taken);
  return { amount, description, date, type };
}

function mergeMappings(base: CsvMappingGuess, override: CsvMappingGuess | null, columns: string[]): CsvMappingGuess {
  const result: CsvMappingGuess = { ...base };
  if (!override) {
    return result;
  }
  (['amount', 'description', 'date', 'type'] as MappingFields[]).forEach((field) => {
    const value = override[field];
    if (typeof value === 'string' && columns.includes(value)) {
      result[field] = value;
    }
  });
  return result;
}

export async function inferCsvMapping(columns: string[], rows: Array<Record<string, string>>): Promise<CsvMappingGuess> {
  const heuristics = inferCsvMappingHeuristics(columns, rows);
  try {
    const aiGuess = await inferCsvColumnsWithAI({ columns, rows: rows.slice(0, 8) });
    return mergeMappings(heuristics, aiGuess, columns);
  } catch (error) {
    console.error('csv_mapping_ai_error', error);
    return heuristics;
  }
}
