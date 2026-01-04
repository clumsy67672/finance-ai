import { OpenRouter } from '@openrouter/sdk';
import {
  AI_VERSION,
  TRANSACTION_CATEGORIES,
  TRANSACTION_SOURCES,
  type TransactionDirection,
  type TransactionCategory,
  type TransactionSource
} from '@/lib/constants';

let client: OpenRouter | null = null;

function getClient(): OpenRouter {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  if (!client) {
    client = new OpenRouter({
      apiKey,
      serverURL: process.env.OPENAI_BASE_URL,
      httpReferer: process.env.OPENAI_SITE_URL,
      xTitle: process.env.OPENAI_APP_NAME
    });
  }

  return client;
}

const structuredFormat = {
  name: 'TransactionClassification',
  schema: {
    type: 'object',
    properties: {
      category: {
        type: 'string',
        enum: [...TRANSACTION_CATEGORIES]
      },
      merchant: {
        type: 'string'
      },
      source: {
        type: 'string',
        enum: [...TRANSACTION_SOURCES]
      },
      tags: {
        type: 'array',
        items: { type: 'string' }
      },
      confidence: {
        type: 'number',
        minimum: 0,
        maximum: 1
      }
    },
    required: ['category', 'merchant', 'source', 'tags', 'confidence'],
    additionalProperties: false
  }
};

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

  const completion = await getClient().chat.send({
    model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
    messages: [
      {
        role: 'system',
        content:
          'You classify Indonesian family finance transactions. Use the provided schema. Category must be one of the allowed labels. Source must be cash, bank, ewallet, or unknown. Tags should be short lowercase keywords.'
      },
      {
        role: 'user',
        content: `Amount (IDR integer): ${input.amount}\nDirection: ${input.direction}\nNote: ${input.cleanNote}`
      }
    ],
    maxCompletionTokens: 256,
    responseFormat: {
      type: 'json_schema',
      jsonSchema: {
        name: structuredFormat.name,
        schema: structuredFormat.schema,
        strict: true
      }
    }
  });

  const firstChoice = completion.choices[0];
  const payload = extractTextPayload(firstChoice?.message?.content);

  if (!payload || typeof payload !== 'string' || !payload.trim()) {
    throw new Error('Empty classification response');
  }

  const parsed = JSON.parse(payload);
  const category = TRANSACTION_CATEGORIES.includes(parsed.category)
    ? (parsed.category as TransactionCategory)
    : fallbackClassification(input.direction).category;
  const source = TRANSACTION_SOURCES.includes(parsed.source)
    ? (parsed.source as TransactionSource)
    : 'unknown';

  return {
    category,
    merchant: parsed.merchant || null,
    source,
    tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5) : [],
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
    model: completion.model ?? process.env.OPENAI_MODEL ?? 'unknown',
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
  const completion = await getClient().chat.send({
    model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
    messages: [
      {
        role: 'system',
        content:
          'You identify which CSV columns represent transaction amount, description, optional date, and optional type. Always return column names exactly as provided or null when unknown.'
      },
      {
        role: 'user',
        content: JSON.stringify({
          columns: input.columns,
          samples: limitedSamples
        })
      }
    ],
    maxCompletionTokens: 256,
    responseFormat: {
      type: 'json_schema',
      jsonSchema: {
        name: mappingFormat.name,
        schema: mappingFormat.schema,
        strict: true
      }
    }
  });
  const mappingChoice = completion.choices[0];
  const payload = extractTextPayload(mappingChoice?.message?.content);
  if (!payload || typeof payload !== 'string') {
    return null;
  }
  const parsed = JSON.parse(payload);
  const sanitize = (value: unknown) =>
    typeof value === 'string' && input.columns.includes(value) ? value : null;
  return {
    amount: sanitize(parsed.amount),
    description: sanitize(parsed.description),
    date: sanitize(parsed.date),
    type: sanitize(parsed.type)
  };
}
