import { z } from 'zod';
import { accountTypes, categoryTypes, dateText, directions, moneyText, transactionTypes } from './finance';

const label = z.string().trim().min(1).max(100);
const optionalLabel = z.string().trim().max(100).nullish().transform(value => value || null);
const notes = z.string().trim().max(2000).nullish().transform(value => value || null);
const color = z.string().regex(/^#[a-f\d]{6}$/iu).nullish().transform(value => value ?? null);
const icon = z.string().regex(/^[a-z][a-z-]{0,30}$/u).nullish().transform(value => value ?? null);
export const idText = z.string().min(1).max(128);

export const accountInput = z.object({
  id: idText.optional(), name: label, type: z.enum(accountTypes), provider: optionalLabel,
  openingBalance: moneyText, openingDate: dateText, notes, color, icon,
});

export const categoryInput = z.object({
  id: idText.optional(), name: label, type: z.enum(categoryTypes), color, icon,
});

export const transactionInput = z.object({
  id: idText.optional(), type: z.enum(transactionTypes), amount: moneyText.refine(value => /[1-9]/u.test(value)),
  accountId: idText, destinationAccountId: idText.nullish(), categoryId: idText.nullish(),
  adjustmentDirection: z.enum(directions).nullish(), description: z.string().trim().min(1).max(160),
  notes, transactionDate: dateText,
});

export function validShape(input: z.output<typeof transactionInput>) {
  const { type, accountId, destinationAccountId, categoryId, adjustmentDirection } = input;
  if (type === 'TRANSFER') return Boolean(destinationAccountId && destinationAccountId !== accountId && !categoryId && !adjustmentDirection);
  if (type === 'ADJUSTMENT') return Boolean(adjustmentDirection && !categoryId && !destinationAccountId);
  return Boolean(categoryId && !destinationAccountId && !adjustmentDirection);
}

export const preferenceInput = z.union([
  z.object({ key: z.literal('language'), value: z.enum(['id', 'en']) }),
  z.object({ key: z.literal('theme'), value: z.enum(['light', 'dark']) }),
  z.object({ key: z.literal('sidebarCollapsed'), value: z.enum(['true', 'false']) }),
]);
