import 'server-only';
import { getDb } from './db';
import type { Account, Category, Transaction, AppSetting } from '@prisma/client';

export function readData() {
  const db = getDb();
  return db.$transaction([
    db.account.findMany({ orderBy: [{ isArchived: 'asc' }, { name: 'asc' }, { id: 'asc' }] }),
    db.category.findMany({ orderBy: [{ isArchived: 'asc' }, { name: 'asc' }, { id: 'asc' }] }),
    db.transaction.findMany({ orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }] }),
    db.appSetting.findMany({ orderBy: { key: 'asc' } }),
  ]);
}

export function serializeData([accounts, categories, transactions, settings]: [Account[], Category[], Transaction[], AppSetting[]]) {
  return {
    accounts: accounts.map(item => ({ ...item, openingBalance: item.openingBalance.toString(), createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString() })),
    categories: categories.map(item => ({ ...item, createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString() })),
    transactions: transactions.map(item => ({ ...item, amount: item.amount.toString(), createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString() })),
    settings: settings.map(item => ({ ...item, updatedAt: item.updatedAt.toISOString() })),
  };
}
