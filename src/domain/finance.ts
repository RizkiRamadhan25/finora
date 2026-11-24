import { z } from 'zod';
import categories from './categories.json';

export const accountTypes = ['BANK', 'EWALLET', 'CASH', 'OTHER'] as const;
export const categoryTypes = ['INCOME', 'EXPENSE'] as const;
export const transactionTypes = ['INCOME', 'EXPENSE', 'TRANSFER', 'ADJUSTMENT'] as const;
export const directions = ['INCREASE', 'DECREASE'] as const;
export type Language = 'id' | 'en';

export function normalizeName(value: string) {
  return value.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLowerCase();
}

export function categoryName(category: { name: string; systemKey: string | null }, language: Language) {
  return categories.find(({ key }) => key === category.systemKey)?.[language] ?? category.name;
}

export const moneyLimit = 9223372036854775807n;
export const moneyText = z.string().regex(/^\d{1,19}$/u).refine(value => /^\d{1,19}$/u.test(value) && BigInt(value) <= moneyLimit);
export function money(value: bigint | string, language: Language) {
  return new Intl.NumberFormat(language === 'id' ? 'id-ID' : 'en-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
  }).format(BigInt(value));
}

export function localDate(date = new Date()) {
  return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export const dateText = z.string().refine(value => {
  if (!/^(?!0000)\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
});

export function formatDate(value: string, language: Language, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(language === 'id' ? 'id-ID' : 'en-GB', {
    ...(options ?? { day: 'numeric', month: 'short', year: 'numeric' }), timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`));
}

export type DateRange = { from: string; to: string };
export function monthRange(today: string, offset = 0): DateRange {
  const [year, month] = today.split('-').map(Number);
  return {
    from: localDate(new Date(year, month - 1 + offset, 1)),
    to: localDate(new Date(year, month + offset, 0)),
  };
}

export function previousRange({ from, to }: DateRange): DateRange {
  const start = new Date(`${from}T00:00:00Z`).getTime();
  const end = new Date(`${to}T00:00:00Z`).getTime();
  const day = 86_400_000;
  const iso = (time: number) => new Date(time).toISOString().slice(0, 10);
  return { from: iso(start - (end - start) - day), to: iso(start - day) };
}

type LedgerAccount = { id: string; openingBalance: string | bigint };
export type LedgerTransaction = {
  amount: string | bigint; type: string; accountId: string; destinationAccountId: string | null;
  categoryId: string | null; adjustmentDirection: string | null; transactionDate: string;
};

export function signedAmount(transaction: LedgerTransaction, accountId = transaction.accountId) {
  const amount = BigInt(transaction.amount);
  if (transaction.destinationAccountId === accountId) return amount;
  if (transaction.accountId !== accountId) return 0n;
  return transaction.type === 'INCOME' || transaction.adjustmentDirection === 'INCREASE' ? amount : -amount;
}

export function accountBalances(accounts: LedgerAccount[], transactions: LedgerTransaction[]) {
  const balances = new Map(accounts.map(account => [account.id, BigInt(account.openingBalance)]));
  for (const transaction of transactions) {
    for (const id of [transaction.accountId, transaction.destinationAccountId]) {
      const balance = id ? balances.get(id) : undefined;
      if (id && balance !== undefined) balances.set(id, balance + signedAmount(transaction, id));
    }
  }
  return balances;
}

export function filterRange<T extends LedgerTransaction>(transactions: T[], { from, to }: DateRange, accountId = '') {
  return transactions.filter(item => (!from || item.transactionDate >= from) && (!to || item.transactionDate <= to)
    && (!accountId || item.accountId === accountId || item.destinationAccountId === accountId));
}

export function cashFlow(transactions: LedgerTransaction[]) {
  let income = 0n;
  let expense = 0n;
  const categories = new Map<string, bigint>();
  for (const item of transactions) {
    if (item.type === 'INCOME') income += BigInt(item.amount);
    if (item.type === 'EXPENSE') {
      const amount = BigInt(item.amount);
      expense += amount;
      if (item.categoryId) categories.set(item.categoryId, (categories.get(item.categoryId) ?? 0n) + amount);
    }
  }
  return { income, expense, net: income - expense, categories };
}

export function sixMonthTrend(transactions: LedgerTransaction[], today: string) {
  return Array.from({ length: 6 }, (_, index) => {
    const range = monthRange(today, index - 5);
    return { month: range.from, ...cashFlow(filterRange(transactions, range)) };
  });
}
