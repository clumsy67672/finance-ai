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

  // Read streaming response
  const text = await response.text();
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
