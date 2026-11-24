import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';

const migration = readFileSync(new URL('../prisma/migrations/20261124000100_initial/migration.sql', import.meta.url), 'utf8');
let db: DatabaseSync;

beforeEach(() => {
  db = new DatabaseSync(':memory:');
  db.exec(migration);
  db.exec(`INSERT INTO "Account" ("id", "name", "type", "openingBalance", "openingDate", "updatedAt")
    VALUES ('cash', 'Cash', 'CASH', 0, '2026-11-24', CURRENT_TIMESTAMP),
           ('bank', 'Bank', 'BANK', 0, '2026-11-24', CURRENT_TIMESTAMP)`);
});
afterEach(() => db.close());

describe('initial SQLite migration', () => {
  it('requires exact nonnegative opening balances and valid account types', () => {
    for (const value of ['-1', '1.25', '9223372036854775808']) {
      expect(() => db.exec(`UPDATE "Account" SET "openingBalance" = ${value}`)).toThrow(/CHECK/);
    }
    expect(() => db.exec(`UPDATE "Account" SET "type" = 'CRYPTO'`)).toThrow(/CHECK/);
  });

  it('enforces positive amounts, distinct transfer accounts, transaction shapes and foreign keys', () => {
    const insert = db.prepare(`INSERT INTO "Transaction" ("id", "type", "amount", "accountId", "destinationAccountId", "description", "transactionDate", "updatedAt")
      VALUES ('test', ?, ?, 'cash', ?, 'Test', '2026-11-24', CURRENT_TIMESTAMP)`);
    expect(() => insert.run('EXPENSE', 1, null)).toThrow(/CHECK/);
    expect(() => insert.run('ADJUSTMENT', 1, null)).toThrow(/CHECK/);
    expect(() => insert.run('TRANSFER', 0, 'bank')).toThrow(/CHECK/);
    expect(() => insert.run('TRANSFER', 1, 'cash')).toThrow(/CHECK/);
    expect(() => insert.run('TRANSFER', 1, 'missing')).toThrow(/FOREIGN KEY/);
    insert.run('TRANSFER', 9223372036854775807n, 'bank');
    expect(() => db.exec(`DELETE FROM "Account" WHERE id = 'bank'`)).toThrow(/FOREIGN KEY/);
  });
});
