import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execute } from '../src/server/ledger';
import { accountBalances, cashFlow, dateText, filterRange, localDate, moneyText, sixMonthTrend } from '../src/domain/finance';
import { backupFormat, parseBackup, replaceData } from '../src/server/backup';
import { transactionCsv } from '../src/server/csv';
import type { Data } from '../src/domain/data';
import definitions from '../src/domain/categories.json';
import preferences from '../src/domain/preferences.json';

const directory = mkdtempSync(join(tmpdir(), 'finora-test-'));
const path = join(directory, 'ledger.db');
const db = new PrismaClient({ datasourceUrl: 'file:' + path });
const today = localDate();
const date = '2025-03-01';

beforeAll(() => {
  const sqlite = new DatabaseSync(path);
  sqlite.exec(readFileSync(new URL('../prisma/migrations/20261124000100_initial/migration.sql', import.meta.url), 'utf8'));
  sqlite.close();
});
afterAll(async () => {
  await db.$disconnect();
  rmSync(directory, { recursive: true });
});
beforeEach(async () => {
  await db.transaction.deleteMany();
  await db.account.deleteMany();
  await db.category.deleteMany();
  await db.appSetting.deleteMany();
  await db.category.createMany({ data: definitions.map(item => ({
    systemKey: item.key, name: item.id, normalizedName: item.id.toLowerCase(), type: item.type, icon: item.icon, color: item.color,
  })) });
  await db.appSetting.createMany({ data: Object.entries(preferences).map(([key, value]) => ({ key, value })) });
});

async function fixtures() {
  await execute(db, 'saveAccount', { name: 'Bank', type: 'BANK', openingBalance: '1000', openingDate: date });
  await execute(db, 'saveAccount', { name: 'Cash', type: 'CASH', openingBalance: '0', openingDate: '2025-03-02' });
  const bank = await db.account.findFirstOrThrow({ where: { name: 'Bank' } });
  const cash = await db.account.findFirstOrThrow({ where: { name: 'Cash' } });
  const income = await db.category.findUniqueOrThrow({ where: { systemKey: 'salary' } });
  const expense = await db.category.findUniqueOrThrow({ where: { systemKey: 'food_beverage' } });
  return { bank, cash, income, expense };
}

async function snapshot(): Promise<Data> {
  const accounts = await db.account.findMany();
  const categories = await db.category.findMany();
  const transactions = await db.transaction.findMany();
  const settings = await db.appSetting.findMany();
  return JSON.parse(JSON.stringify({ accounts, categories, transactions, settings }, (_key, value) => typeof value === 'bigint' ? value.toString() : value)) as Data;
}

describe('account and category rules', () => {
  it('offers cash without precreating it and does not duplicate setup', async () => {
    expect(await db.account.count()).toBe(0);
    await execute(db, 'setup', { cash: true, name: 'Tunai', amount: '0' });
    await execute(db, 'setup', { cash: true, name: 'Tunai', amount: '0' });
    expect(await db.account.count()).toBe(1);
  });

  it('keeps opening balances and dates locked, requires zero to archive, and protects archived history', async () => {
    const { bank, income } = await fixtures();
    const payload = { type: 'INCOME', accountId: bank.id, categoryId: income.id, description: 'Pay', amount: '50', transactionDate: today };
    await execute(db, 'saveTransaction', payload);
    await expect(execute(db, 'saveAccount', { ...bank, openingBalance: '1050' })).rejects.toThrow('openingLocked');
    await expect(execute(db, 'deleteAccount', bank.id)).rejects.toThrow('accountInUse');
    await expect(execute(db, 'archiveAccount', bank.id)).rejects.toThrow('balanceNotZero');
    await execute(db, 'saveTransaction', { ...payload, type: 'ADJUSTMENT', categoryId: null, adjustmentDirection: 'DECREASE', amount: '1050' });
    await execute(db, 'archiveAccount', bank.id);
    const transaction = await db.transaction.findFirstOrThrow({ where: { description: 'Pay', type: 'INCOME' } });
    await expect(execute(db, 'deleteTransaction', transaction.id)).rejects.toThrow('accountArchived');
    await expect(execute(db, 'saveTransaction', payload)).rejects.toThrow('accountArchived');
    await execute(db, 'activateAccount', bank.id);
    expect(await execute(db, 'deleteTransaction', transaction.id)).toBe(true);
  });

  it('normalizes custom category names, protects built-in identity and preserves archived history', async () => {
    const { bank, expense } = await fixtures();
    await execute(db, 'saveCategory', { name: 'Kopi  pagi', type: 'EXPENSE' });
    await expect(execute(db, 'saveCategory', { name: 'KOPI PAGI', type: 'EXPENSE' })).rejects.toThrow('duplicateCategory');
    await expect(execute(db, 'saveCategory', { id: expense.id, name: 'Rename', type: 'EXPENSE' })).rejects.toThrow('categoryProtected');
    const old = { type: 'EXPENSE', accountId: bank.id, categoryId: expense.id, description: 'Food', amount: '10', transactionDate: today };
    await execute(db, 'saveTransaction', old);
    await execute(db, 'archiveCategory', expense.id);
    await expect(execute(db, 'saveTransaction', old)).rejects.toThrow('categoryInvalid');
    expect(await db.transaction.count({ where: { categoryId: expense.id } })).toBe(1);
  });
});

describe('transaction ledger and reporting', () => {
  it('applies transfer once, preserves total, edits and deletes both sides, and warns for a negative balance', async () => {
    const { bank, cash } = await fixtures();
    const transfer = { type: 'TRANSFER', accountId: bank.id, destinationAccountId: cash.id, amount: '250', description: 'Move', transactionDate: today };
    await execute(db, 'saveTransaction', transfer);
    const balance = async () => accountBalances([bank, cash], await db.transaction.findMany());
    expect([...(await balance()).values()]).toEqual([750n, 250n]);
    const item = await db.transaction.findFirstOrThrow();
    expect(await execute(db, 'saveTransaction', { ...transfer, id: item.id, amount: '1100' })).toBe(true);
    expect([...(await balance()).values()]).toEqual([-100n, 1100n]);
    await execute(db, 'deleteTransaction', item.id);
    expect([...(await balance()).values()]).toEqual([1000n, 0n]);
  });

  it('rejects impossible dates, invalid combinations and monetary overflow without writing a partial row', async () => {
    const { bank, cash, income } = await fixtures();
    const transfer = { type: 'TRANSFER', accountId: bank.id, destinationAccountId: cash.id, amount: '1', description: 'Move', transactionDate: today };
    await expect(execute(db, 'saveTransaction', { ...transfer, destinationAccountId: bank.id })).rejects.toThrow('sameAccount');
    await expect(execute(db, 'saveTransaction', { ...transfer, transactionDate: date })).rejects.toThrow('beforeOpening');
    await expect(execute(db, 'saveTransaction', { ...transfer, transactionDate: '9999-12-31' })).rejects.toThrow('dateInvalid');
    await expect(execute(db, 'saveTransaction', { ...transfer, type: 'EXPENSE', categoryId: income.id, destinationAccountId: null })).rejects.toThrow('categoryInvalid');
    await expect(execute(db, 'saveTransaction', { ...transfer, amount: '9223372036854775808' })).rejects.toThrow();
    expect(moneyText.safeParse('1.5').success).toBe(false);
    expect(dateText.safeParse('2025-02-29').success).toBe(false);
    expect(await db.transaction.count()).toBe(0);
  });

  it('keeps exact financial totals and excludes transfers and adjustments from cash flow', async () => {
    const { bank, cash, expense, income } = await fixtures();
    const base = { accountId: bank.id, amount: '5', description: 'Entry', transactionDate: today };
    await execute(db, 'saveTransaction', { ...base, type: 'INCOME', categoryId: income.id, amount: '9007199254740993' });
    await execute(db, 'saveTransaction', { ...base, type: 'EXPENSE', categoryId: expense.id });
    await execute(db, 'saveTransaction', { ...base, type: 'TRANSFER', destinationAccountId: cash.id });
    await execute(db, 'saveTransaction', { ...base, type: 'ADJUSTMENT', adjustmentDirection: 'INCREASE' });
    const transactions = await db.transaction.findMany();
    const flow = cashFlow(filterRange(transactions, { from: today, to: today }));
    expect([flow.income, flow.expense, flow.net]).toEqual([9007199254740993n, 5n, 9007199254740988n]);
    expect(flow.categories.get(expense.id)).toBe(5n);
    expect(sixMonthTrend(transactions, today)).toHaveLength(6);
  });
});

describe('backup and exports', () => {
  it('preserves BigInt and text in the export and rejects invalid versions and relationships', async () => {
    const { bank, income } = await fixtures();
    await execute(db, 'saveTransaction', { type: 'INCOME', accountId: bank.id, categoryId: income.id, amount: '9223372036854775807',
      description: '=SUM(1,2)', notes: 'Kopi “pagi”', transactionDate: today });
    const data = await snapshot();
    const backup = { ...backupFormat, createdAt: new Date().toISOString(), data };
    const parsed = parseBackup(JSON.stringify(backup));
    expect(parsed.data.transactions[0].amount).toBe('9223372036854775807');
    expect(() => parseBackup(JSON.stringify({ ...backup, version: 2 }))).toThrow();
    const broken = structuredClone(backup);
    broken.data.transactions[0].accountId = 'missing';
    expect(() => parseBackup(JSON.stringify(broken))).toThrow();
    const csv = transactionCsv(data, data.transactions, 'id');
    expect(csv).toContain(`"'=SUM(1,2)"`);
    expect(csv).toContain('Kopi “pagi”');
    expect(csv).toContain('9223372036854775807');

    const currentId = data.transactions[0].id;
    await execute(db, 'deleteTransaction', currentId);
    await replaceData(db, parsed);
    expect((await db.transaction.findFirstOrThrow()).amount).toBe(9223372036854775807n);

    parsed.data.transactions[0].accountId = 'missing';
    await expect(replaceData(db, parsed)).rejects.toThrow();
    expect(await db.transaction.count()).toBe(1);
    expect(await db.account.count()).toBe(2);
  });

  it('restores a larger ledger and computes its balance and period totals', async () => {
    const { bank, income } = await fixtures();
    const data = await snapshot();
    const createdAt = new Date().toISOString();
    data.transactions = Array.from({ length: 3_000 }, (_, index) => ({
      id: `entry-${index}`, type: 'INCOME', accountId: bank.id, destinationAccountId: null,
      categoryId: income.id, amount: '25', adjustmentDirection: null, description: 'Entry', notes: null,
      transactionDate: today, createdAt, updatedAt: createdAt,
    }));
    const backup = parseBackup(JSON.stringify({ ...backupFormat, createdAt, data }));
    await replaceData(db, backup);
    const restored = await snapshot();
    expect(restored.transactions).toHaveLength(3_000);
    expect(accountBalances(restored.accounts, restored.transactions).get(bank.id)).toBe(76_000n);
    expect(cashFlow(filterRange(restored.transactions, { from: today, to: today })).net).toBe(75_000n);
  });
});
