import { Prisma, type PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { accountBalances, localDate, normalizeName } from '../domain/finance';
import { accountInput, categoryInput, idText, preferenceInput, transactionInput, validShape } from '../domain/schema';
import categories from '../domain/categories.json';

export class LedgerError extends Error {}

function reject(reason: string): never {
  throw new LedgerError(reason);
}

export const operations = [
  'saveAccount', 'archiveAccount', 'activateAccount', 'deleteAccount', 'saveCategory', 'archiveCategory',
  'activateCategory', 'deleteCategory', 'saveTransaction', 'deleteTransaction', 'setup', 'preference',
] as const;
export type Operation = typeof operations[number];

function accountTransactions(db: Prisma.TransactionClient, ids: string[]) {
  return db.transaction.findMany({ where: { OR: [{ accountId: { in: ids } }, { destinationAccountId: { in: ids } }] } });
}

async function accountCommand(db: Prisma.TransactionClient, operation: Operation, payload: unknown) {
  if (operation === 'saveAccount') {
    const { id, openingBalance, ...values } = accountInput.parse(payload);
    const amount = BigInt(openingBalance);
    if (values.openingDate > localDate()) reject('dateInvalid');
    if (!id) {
      await db.account.create({ data: { ...values, openingBalance: amount } });
      await db.appSetting.updateMany({ where: { key: 'setupComplete', value: 'false' }, data: { value: 'true' } });
      return false;
    }
    const account = await db.account.findUnique({ where: { id } });
    if (!account) reject('accountMissing');
    if ((account.openingBalance !== amount || account.openingDate !== values.openingDate) && (await accountTransactions(db, [id])).length) reject('openingLocked');
    if (account.isArchived && amount !== 0n && account.openingBalance !== amount) reject('balanceNotZero');
    await db.account.update({ where: { id }, data: { ...values, openingBalance: amount } });
    return false;
  }
  const id = idText.parse(payload);
  const account = await db.account.findUnique({ where: { id } });
  if (!account) reject('accountMissing');
  if (operation === 'deleteAccount') {
    if ((await accountTransactions(db, [id])).length) reject('accountInUse');
    await db.account.delete({ where: { id } });
  } else {
    const isArchived = operation === 'archiveAccount';
    if (isArchived && accountBalances([account], await accountTransactions(db, [id])).get(id) !== 0n) reject('balanceNotZero');
    await db.account.update({ where: { id }, data: { isArchived } });
  }
  return false;
}

async function categoryCommand(db: Prisma.TransactionClient, operation: Operation, payload: unknown) {
  if (operation === 'saveCategory') {
    const { id, name, type, ...style } = categoryInput.parse(payload);
    const existing = id ? await db.category.findUnique({ where: { id } }) : null;
    if (id && !existing) reject('categoryInvalid');
    if (existing?.systemKey) {
      if (existing.name !== name || existing.type !== type) reject('categoryProtected');
      await db.category.update({ where: { id }, data: style });
      return false;
    }
    if (existing && existing.type !== type && await db.transaction.count({ where: { categoryId: id } })) reject('categoryProtected');
    const normalizedName = normalizeName(name);
    if (categories.some(item => item.type === type && [item.id, item.en].some(label => normalizeName(label) === normalizedName))) reject('duplicateCategory');
    const conflict = await db.category.findUnique({ where: { type_normalizedName: { type, normalizedName } } });
    if (conflict && conflict.id !== id) reject('duplicateCategory');
    const data = { ...style, name, type, normalizedName };
    if (id) await db.category.update({ where: { id }, data });
    else await db.category.create({ data });
    return false;
  }
  const id = idText.parse(payload);
  const category = await db.category.findUnique({ where: { id } });
  if (!category) reject('categoryInvalid');
  if (operation === 'deleteCategory') {
    if (category.systemKey || await db.transaction.count({ where: { categoryId: id } })) reject('categoryProtected');
    await db.category.delete({ where: { id } });
  } else {
    await db.category.update({ where: { id }, data: { isArchived: operation === 'archiveCategory' } });
  }
  return false;
}

async function transactionCommand(db: Prisma.TransactionClient, operation: Operation, payload: unknown) {
  const input = operation === 'saveTransaction' ? transactionInput.parse(payload) : null;
  const id = input ? input.id : idText.parse(payload);
  const existing = id ? await db.transaction.findUnique({ where: { id } }) : null;
  if (id && !existing) reject('transactionMissing');

  const ids = [...new Set([existing?.accountId, existing?.destinationAccountId, input?.accountId, input?.destinationAccountId]
    .filter((value): value is string => Boolean(value)))];
  const accounts = await db.account.findMany({ where: { id: { in: ids } } });
  if (accounts.length !== ids.length) reject('accountMissing');
  if (accounts.some(account => account.isArchived)) reject('accountArchived');
  if (!input) {
    await db.transaction.delete({ where: { id } });
    return [...accountBalances(accounts, await accountTransactions(db, ids)).values()].some(balance => balance < 0n);
  }
  if (input.type === 'TRANSFER' && input.accountId === input.destinationAccountId) reject('sameAccount');
  if (!validShape(input)) reject('invalid');
  if (input.transactionDate > localDate()) reject('dateInvalid');
  if (accounts.some(account => (account.id === input.accountId || account.id === input.destinationAccountId) && account.openingDate > input.transactionDate)) reject('beforeOpening');
  if (input.categoryId) {
    const category = await db.category.findUnique({ where: { id: input.categoryId } });
    if (!category || category.type !== input.type || (category.isArchived && existing?.categoryId !== category.id)) reject('categoryInvalid');
  }
  const data = {
    accountId: input.accountId, type: input.type, amount: BigInt(input.amount), notes: input.notes, description: input.description,
    transactionDate: input.transactionDate, categoryId: input.categoryId ?? null, destinationAccountId: input.destinationAccountId ?? null,
    adjustmentDirection: input.adjustmentDirection ?? null,
  };
  if (id) await db.transaction.update({ where: { id }, data });
  else await db.transaction.create({ data });
  return [...accountBalances(accounts, await accountTransactions(db, ids)).values()].some(balance => balance < 0n);
}

export function execute(db: PrismaClient, operation: Operation, payload: unknown) {
  if (!operations.includes(operation)) reject('invalid');
  return db.$transaction(async tx => {
    if (operation === 'setup') {
      const input = z.object({ cash: z.boolean(), name: z.string().trim().min(1).max(100), amount: accountInput.shape.openingBalance }).parse(payload);
      const setup = await tx.appSetting.findUnique({ where: { key: 'setupComplete' } });
      if (setup?.value === 'true') return false;
      if (input.cash) await tx.account.create({ data: { name: input.name, type: 'CASH', openingBalance: BigInt(input.amount), openingDate: localDate() } });
      await tx.appSetting.upsert({ where: { key: 'setupComplete' }, create: { key: 'setupComplete', value: 'true' }, update: { value: 'true' } });
      return false;
    }
    if (operation === 'preference') {
      const { key, value } = preferenceInput.parse(payload);
      await tx.appSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
      return false;
    }
    if (operation.endsWith('Account')) return accountCommand(tx, operation, payload);
    if (operation.endsWith('Category')) return categoryCommand(tx, operation, payload);
    return transactionCommand(tx, operation, payload);
  });
}
