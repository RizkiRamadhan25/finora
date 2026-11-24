CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL CHECK ("type" IN ('BANK', 'EWALLET', 'CASH', 'OTHER')),
    "provider" TEXT,
    "openingBalance" BIGINT NOT NULL CHECK (typeof("openingBalance") = 'integer' AND "openingBalance" >= 0),
    "openingDate" TEXT NOT NULL,
    "icon" TEXT,
    "color" TEXT,
    "notes" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "type" TEXT NOT NULL CHECK ("type" IN ('INCOME', 'EXPENSE')),
    "systemKey" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL CHECK ("type" IN ('INCOME', 'EXPENSE', 'TRANSFER', 'ADJUSTMENT')),
    "amount" BIGINT NOT NULL CHECK (typeof("amount") = 'integer' AND "amount" > 0),
    "accountId" TEXT NOT NULL,
    "destinationAccountId" TEXT,
    "categoryId" TEXT,
    "adjustmentDirection" TEXT CHECK ("adjustmentDirection" IN ('INCREASE', 'DECREASE')),
    "description" TEXT NOT NULL,
    "notes" TEXT,
    "transactionDate" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transaction_destinationAccountId_fkey" FOREIGN KEY ("destinationAccountId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transaction_shape" CHECK (
        ("type" IN ('INCOME', 'EXPENSE') AND "categoryId" IS NOT NULL AND "destinationAccountId" IS NULL AND "adjustmentDirection" IS NULL)
        OR ("type" = 'TRANSFER' AND "categoryId" IS NULL AND "destinationAccountId" IS NOT NULL AND "destinationAccountId" <> "accountId" AND "adjustmentDirection" IS NULL)
        OR ("type" = 'ADJUSTMENT' AND "categoryId" IS NULL AND "destinationAccountId" IS NULL AND "adjustmentDirection" IS NOT NULL)
    )
);

CREATE TABLE "AppSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

CREATE INDEX "Account_isArchived_name_idx" ON "Account"("isArchived", "name");
CREATE UNIQUE INDEX "Category_systemKey_key" ON "Category"("systemKey");
CREATE UNIQUE INDEX "Category_type_normalizedName_key" ON "Category"("type", "normalizedName");
CREATE INDEX "Category_type_isArchived_idx" ON "Category"("type", "isArchived");
CREATE INDEX "Transaction_transactionDate_idx" ON "Transaction"("transactionDate");
CREATE INDEX "Transaction_accountId_transactionDate_idx" ON "Transaction"("accountId", "transactionDate");
CREATE INDEX "Transaction_destinationAccountId_transactionDate_idx" ON "Transaction"("destinationAccountId", "transactionDate");
CREATE INDEX "Transaction_categoryId_transactionDate_idx" ON "Transaction"("categoryId", "transactionDate");
CREATE INDEX "Transaction_type_transactionDate_idx" ON "Transaction"("type", "transactionDate");
CREATE UNIQUE INDEX "AppSetting_key_key" ON "AppSetting"("key");
