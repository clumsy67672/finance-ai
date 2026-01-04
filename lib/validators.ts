import { z } from 'zod';
import { TRANSACTION_CATEGORIES, TRANSACTION_DIRECTIONS } from '@/lib/constants';

export const categoryEnum = z.enum([...TRANSACTION_CATEGORIES] as [typeof TRANSACTION_CATEGORIES[number], ...typeof TRANSACTION_CATEGORIES[number][]]);
export const directionEnum = z.enum([...TRANSACTION_DIRECTIONS] as [typeof TRANSACTION_DIRECTIONS[number], ...typeof TRANSACTION_DIRECTIONS[number][]]);

export const registerSchema = z.object({
  username: z.string().min(3).max(32),
  password: z.string().min(8).max(128)
});

export const loginSchema = registerSchema;

export const transactionMessageSchema = z.object({
  message: z.string().min(3).max(280)
});

export const transactionUpdateSchema = z.object({
  amount: z.number().int().positive().optional(),
  category: categoryEnum.optional(),
  occurredAt: z.string().optional(),
  cleanNote: z.string().max(280).optional()
});

export const transactionFiltersSchema = z.object({
  month: z.string().optional(),
  category: z.string().optional(),
  direction: directionEnum.optional(),
  userId: z.string().optional()
});

export const csvMappingSchema = z.object({
  amount: z.string(),
  description: z.string(),
  date: z.string().optional(),
  type: z.string().optional(),
  targetUserId: z.string().optional()
});
