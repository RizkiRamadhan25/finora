import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import defaults from '../domain/preferences.json';
import definitions from '../domain/categories.json';
import { accountInput, categoryInput, idText, preferenceInput, transactionInput, validShape } from '../domain/schema';
import { accountBalances, localDate, normalizeName } from '../domain/finance';

const stamp = z.iso.datetime();
const archived = { id: idText, isArchived: z.boolean(), createdAt: stamp, updatedAt: stamp };
const settingsSchema = z.object({ id: idText, key: z.string(), value: z.string(), updatedAt: stamp });
const backupSchema = z.object({
  format: z.literal('Finora'), version: z.literal(1), createdAt: stamp,
  data: z.object({
    accounts: z.array(accountInput.extend(archived)),
    categories: z.array(categoryInput.extend({ ...archived, systemKey: z.string().nullable(), normalizedName: z.string() })),
    transactions: z.array(transactionInput.extend({ id: idText, createdAt: stamp, updatedAt: stamp,
      destinationAccountId: transactionInput.shape.destinationAccountId.nonoptional(),
      categoryId: transactionInput.shape.categoryId.nonoptional(),
      adjustmentDirection: transactionInput.shape.adjustmentDirection.nonoptional(),
    })),
    settings: z.array(settingsSchema),
  }),
});

export const backupFormat = { format: 'Finora', version: 1 } as const;
export type Backup = z.output<typeof backupSchema>;

function unique<T>(items: T[], key: (item: T) => string) {
  return new Set(items.map(key)).size === items.length;
}

function validate({ accounts, categories, transactions, settings }: Backup['data']) {
  const groups: { id: string }[][] = [accounts, categories, transactions, settings];
  if (!groups.every(group => unique(group, item => item.id))) return false;
  if (!unique(settings, item => item.key) || settings.length !== Object.keys(defaults).length) return false;
  if (!settings.every(item => item.key === 'setupComplete' ? ['true', 'false'].includes(item.value) : preferenceInput.safeParse(item).success)) return false;
  const system = categories.filter(item => item.systemKey !== null);
  if (system.length !== definitions.length || !unique(system, item => item.systemKey ?? '')) return false;
  if (!unique(categories, item => item.type + '|' + item.normalizedName)) return false;
  for (const category of categories) {
    if (category.normalizedName !== normalizeName(category.name)) return false;
    if (category.systemKey !== null) {
      const definition = definitions.find(item => item.key === category.systemKey);
      if (!definition || definition.type !== category.type || definition.id !== category.name) return false;
    }
  }
  const accountsById = new Map(accounts.map(item => [item.id, item]));
  const categoriesById = new Map(categories.map(item => [item.id, item]));
  const today = localDate();
  if (accounts.some(account => account.openingDate > today)) return false;
  for (const item of transactions) {
    if (!validShape(item) || item.transactionDate > today) return false;
    const source = accountsById.get(item.accountId);
    const destination = item.destinationAccountId ? accountsById.get(item.destinationAccountId) : null;
    if (!source || item.transactionDate < source.openingDate) return false;
    if (item.destinationAccountId && (!destination || item.transactionDate < destination.openingDate)) return false;
    if (item.categoryId && categoriesById.get(item.categoryId)?.type !== item.type) return false;
  }
  const balances = accountBalances(accounts, transactions);
  return accounts.every(item => !item.isArchived || balances.get(item.id) === 0n);
}

export function parseBackup(content: string) {
  const result = backupSchema.safeParse(JSON.parse(content.replace(/^\uFEFF/u, '')));
  if (!result.success || !validate(result.data.data)) throw new Error('Invalid Finora backup');
  return result.data;
}

export async function replaceData(db: PrismaClient, { data }: Backup) {
  await db.$transaction(async tx => {
    await tx.transaction.deleteMany();
    await tx.account.deleteMany();
    await tx.category.deleteMany();
    await tx.appSetting.deleteMany();
    await tx.account.createMany({ data: data.accounts.map(item => ({ ...item, openingBalance: BigInt(item.openingBalance) })) });
    await tx.category.createMany({ data: data.categories });
    await tx.transaction.createMany({ data: data.transactions.map(item => ({ ...item, amount: BigInt(item.amount) })) });
    await tx.appSetting.createMany({ data: data.settings });
  }, { timeout: 30_000 });
}
