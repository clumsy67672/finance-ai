import {
  AI_VERSION,
  TRANSACTION_CATEGORIES,
  TRANSACTION_SOURCES,
  type TransactionDirection,
  type TransactionCategory,
  type TransactionSource
} from '@/lib/constants';

const VALID_CATEGORIES = TRANSACTION_CATEGORIES.join(', ');
const VALID_SOURCES = TRANSACTION_SOURCES.join(', ');

function classifyPrompt(amount: number, cleanNote: string, direction: TransactionDirection) {
  return {
    model: process.env.OPENAI_MODEL || 'qwen-web/qwen3.6-plus',
    messages: [
      {
        role: 'system',
        content: `You classify Indonesian family finance transactions. Return ONLY valid JSON with no markdown, no code fences, no extra text.
Rules:
- category must be exactly one of: ${VALID_CATEGORIES}
- merchant: string or null
- source must be exactly one of: ${VALID_SOURCES}
- tags: short lowercase keywords array
- confidence: number between 0 and 1
- Input is in Bahasa Indonesia — understand it as such
- Fix typos in the note (e.g. "serviis" → "servis", "gacoan" → "Mie Gacoan") but keep the meaning
Common item → category mappings:
  IMPORTANT: rokok, sigaret, twiz → Other (NOT Food & Drink, NOT Entertainment)
  minum, minuman → Food & Drink
  jajan, jajanan → Food & Drink
  gorengan → Food & Drink
  bensin, pertalite, pertamax, solar → Fuel / Gas
  pulsa, paket data, paketan → Internet & Mobile
  shuttlecock, badminton, kok → Sports / Outdoor
  servis, service → Self Care
  bayar utang, bayar hutang → Loan / Debt
  kunci, palu, obeng, tespen → Household Needs
  indomaret, alfamart → Groceries
  naik gunung, hiking, camping → Sports / Outdoor
  bayar paylater, kredivo, akulaku → Loan / Debt
  tf, transfer → Transfer
  gaji, salary → Salary / Income
Example: {"category":"Food & Drink","merchant":"Indomaret","source":"cash","tags":["snacks"],"confidence":0.9}`
      },
      {
        role: 'user',
        content: `Amount (IDR integer): ${amount}\nDirection: ${direction}\nNote: ${cleanNote}`
      }
    ],
    max_tokens: 256
  };
}

async function callOmniRoute(body: object): Promise<string> {
  const baseUrl = process.env.OPENAI_BASE_URL || 'http://localhost:20128/v1';
  const apiKey = process.env.OPENAI_API_KEY || 'sk-local';
  const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OmniRoute API error ${response.status}: ${text}`);
  }

  // Read response text
  const text = await response.text();

  // Try parsing as standard non-streamed JSON response first
  try {
    const parsedJson = JSON.parse(text);
    const content = parsedJson.choices?.[0]?.message?.content;
    if (typeof content === 'string') {
      return content;
    }
  } catch {
    // Not a standard single JSON response, parsing as SSE stream
  }

  let fullContent = '';

  for (const line of text.split('\n')) {
    if (line.startsWith('data: ') && line.trim() !== 'data: [DONE]') {
      try {
        const parsed = JSON.parse(line.slice(6));
        const delta = parsed.choices?.[0]?.delta;
        if (delta?.content) {
          fullContent += delta.content;
        }
      } catch {
        // skip parse errors
      }
    }
  }

  return fullContent || text;
}

const mappingFormat = {
  name: 'CsvMapping',
  schema: {
    type: 'object',
    properties: {
      amount: { type: ['string', 'null'] },
      description: { type: ['string', 'null'] },
      date: { type: ['string', 'null'] },
      type: { type: ['string', 'null'] }
    },
    required: ['amount', 'description', 'date', 'type'],
    additionalProperties: false
  }
};

export type ClassificationResult = {
  category: TransactionCategory;
  merchant: string | null;
  source: TransactionSource;
  tags: string[];
  confidence: number;
  model: string;
  version: string;
};

function fallbackClassification(direction: TransactionDirection): ClassificationResult {
  const category: TransactionCategory =
    direction === 'income' ? 'Salary / Income' : direction === 'transfer' ? 'Transfer' : 'Other';
  return {
    category,
    merchant: null,
    source: 'unknown',
    tags: [],
    confidence: 0,
    model: 'fallback',
    version: AI_VERSION
  };
}

function extractTextPayload(content: unknown): string | undefined {
  if (typeof content === 'string') {
    return content;
  }
  if (Array.isArray(content)) {
    const textItem = content.find(
      (item): item is { text: string } =>
        typeof item === 'object' && item !== null && 'text' in item && typeof (item as any).text === 'string'
    );
    return textItem?.text;
  }
  return undefined;
}

export async function classifyTransaction(input: {
  amount: number;
  cleanNote: string;
  direction: TransactionDirection;
}): Promise<ClassificationResult> {
  if (!process.env.OPENAI_API_KEY) {
    return fallbackClassification(input.direction);
  }

  const body = classifyPrompt(input.amount, input.cleanNote, input.direction);
  let rawContent: string;

  try {
    rawContent = await callOmniRoute(body);
  } catch {
    return fallbackClassification(input.direction);
  }

  if (!rawContent || !rawContent.trim()) {
    return fallbackClassification(input.direction);
  }

  // Try to extract JSON from the response (handle markdown fences)
  let jsonStr = rawContent.trim();
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonStr = jsonMatch[0];
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    return fallbackClassification(input.direction);
  }

  const category = TRANSACTION_CATEGORIES.includes(parsed.category as any)
    ? (parsed.category as TransactionCategory)
    : fallbackClassification(input.direction).category;
  const source = TRANSACTION_SOURCES.includes(parsed.source as any)
    ? (parsed.source as TransactionSource)
    : 'unknown';

  return {
    category,
    merchant: typeof parsed.merchant === 'string' ? parsed.merchant : null,
    source,
    tags: Array.isArray(parsed.tags) ? (parsed.tags as string[]).slice(0, 5) : [],
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
    model: body.model,
    version: AI_VERSION
  };
}

export type ParsedTransaction = {
  amount: number;
  cleanNote: string;
  direction: TransactionDirection;
  category: TransactionCategory;
  merchant: string | null;
  source: TransactionSource;
  tags: string[];
  confidence: number;
};

/**
 * Send raw message text to AI to extract all individual transactions.
 * Falls back to local parsing if AI fails.
 */
export async function parseTransactions(rawMessage: string): Promise<ParsedTransaction[] | null> {
  if (!process.env.OPENAI_API_KEY) return null;

  const body = {
    model: process.env.OPENAI_MODEL || 'qwen-web/qwen3.6-plus',
    messages: [
      {
        role: 'system',
        content: `You are a family finance transaction parser. Given Indonesian chat text (Bahasa Indonesia), extract EACH individual transaction.
Return a JSON **array** of objects. ONLY valid JSON array, NO markdown, NO code fences.

CATEGORY MUST BE EXACTLY one of these (case-sensitive): ${VALID_CATEGORIES}

Each object:
{
  "amount": integer (positive IDR — expand k=1000, rb=1000, ribu=1000, jt=1000000, juta=1000000, m=1000000),
  "note": "short Indonesian description (fix minor typos)",
  "direction": "expense" | "income" | "transfer",
  "category": "EXACT category from the list above",
  "merchant": string or null,
  "source": "cash" | "bank" | "ewallet" | "unknown",
  "tags": ["lowercase", "keywords"],
  "confidence": 0.0-1.0
}

Rules:
- Input is in Bahasa Indonesia — understand slang, typos, and abbreviations
- Split text into individual transactions by recognizing amounts, transition words (terus, lalu, lanjut), or natural boundaries
- Fix typos in the note (e.g. "serviis" → "Servis", "gacoan" → "Mie Gacoan")
- IMPORTANT: "rokok", "sigaret", "twiz" → MUST be "Other". NOT Food & Drink. NOT Entertainment.
- "minum" → "Food & Drink"
- "jajan", "jajanan", "gorengan" → "Food & Drink"
- "bensin", "pertalite", "pertamax" → "Fuel / Gas"
- "pulsa", "paket data", "paketan" → "Internet & Mobile"
- "badminton", "shuttlecock", "naik gunung", "hiking" → "Sports / Outdoor"
- "servis", "service" → "Self Care"
- "kunci", "obeng", "tespen", "palu" → "Household Needs"
- "indomaret", "alfamart" → "Groceries"
- "pohong", "sossis", "gorengan" → "Groceries"
- "bayar utang", "bayar hutang", "paylater", "kredivo" → "Loan / Debt"
- "bayar badminton" → "Sports / Outdoor" (NOT Loan / Debt)
- "tf", "transfer" → "Transfer (direction)" or follow context
- "gaji", "salary", "honor" → "Salary / Income"
- "beli" → "expense"
- Entertainment is for movies, games, concerts, streaming — NOT for daily items`
      },
      {
        role: 'user',
        content: rawMessage
      }
    ],
    max_tokens: 1024
  };

  try {
    const rawContent = await callOmniRoute(body);
    const jsonMatch = rawContent.match(/\[[\s\S]*\]/);
    const jsonStr = jsonMatch ? jsonMatch[0] : rawContent.trim();
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) return null;

    return parsed.map((item: any) => ({
      amount: typeof item.amount === 'number' ? Math.round(Math.abs(item.amount)) : 0,
      cleanNote: typeof item.note === 'string' ? item.note.charAt(0).toUpperCase() + item.note.slice(1) : 'Unknown',
      direction: ['expense', 'income', 'transfer'].includes(item.direction) ? item.direction : 'expense',
      category: TRANSACTION_CATEGORIES.includes(item.category) ? item.category : 'Other',
      merchant: typeof item.merchant === 'string' ? item.merchant : null,
      source: TRANSACTION_SOURCES.includes(item.source) ? item.source : 'unknown',
      tags: Array.isArray(item.tags) ? item.tags.slice(0, 5) : [],
      confidence: typeof item.confidence === 'number' ? item.confidence : 0,
    }));
  } catch {
    return null;
  }
}

export async function inferCsvColumnsWithAI(input: {
  columns: string[];
  rows: Array<Record<string, string>>;
}): Promise<{ amount: string | null; description: string | null; date: string | null; type: string | null } | null> {
  if (!process.env.OPENAI_API_KEY || input.columns.length === 0) {
    return null;
  }
  const limitedSamples = input.rows.slice(0, 5).map((row, index) => {
    const entry: Record<string, string> = {};
    const entries = Object.entries(row);
    for (let i = 0; i < entries.length && i < 10; i += 1) {
      const [key, value] = entries[i];
      entry[key] = value;
    }
    return { row: index + 1, values: entry };
  });

  const body = {
    model: process.env.OPENAI_MODEL || 'qwen-web/qwen3.6-plus',
    messages: [
      {
        role: 'system',
        content:
          'You identify which CSV columns represent transaction amount, description, optional date, and optional type. Always return column names exactly as provided or null when unknown. Return ONLY valid JSON.'
      },
      {
        role: 'user',
        content: JSON.stringify({
          columns: input.columns,
          samples: limitedSamples
        })
      }
    ],
    max_tokens: 256
  };

  try {
    const rawContent = await callOmniRoute(body);
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : rawContent.trim();
    const parsed = JSON.parse(jsonStr);
    const sanitize = (value: unknown) =>
      typeof value === 'string' && input.columns.includes(value) ? value : null;
    return {
      amount: sanitize(parsed.amount),
      description: sanitize(parsed.description),
      date: sanitize(parsed.date),
      type: sanitize(parsed.type)
    };
  } catch {
    return null;
  }
}
