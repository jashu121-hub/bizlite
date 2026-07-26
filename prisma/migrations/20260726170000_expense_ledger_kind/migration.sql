-- Separate operating expenses from inventory / production payments

DO $$ BEGIN
  CREATE TYPE "ExpenseLedgerKind" AS ENUM (
    'OPERATING',
    'INVENTORY_PURCHASE',
    'PRODUCTION_PAYMENT',
    'ASSET_PURCHASE'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE "CashTransactionType" ADD VALUE IF NOT EXISTS 'PRODUCTION_PAYMENT';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "Expense"
ADD COLUMN IF NOT EXISTS "ledgerKind" "ExpenseLedgerKind" NOT NULL DEFAULT 'OPERATING',
ADD COLUMN IF NOT EXISTS "costCalculationId" TEXT,
ADD COLUMN IF NOT EXISTS "stockMovementId" TEXT;

-- Cost-calculator created PRODUCTION rows are payments, not operating expenses / SIMPLE COGS.
UPDATE "Expense"
SET "ledgerKind" = 'PRODUCTION_PAYMENT'
WHERE "reference" LIKE 'COSTCALC:%'
  AND "ledgerKind" = 'OPERATING';

CREATE INDEX IF NOT EXISTS "Expense_userId_ledgerKind_idx" ON "Expense"("userId", "ledgerKind");
CREATE INDEX IF NOT EXISTS "Expense_costCalculationId_idx" ON "Expense"("costCalculationId");
CREATE INDEX IF NOT EXISTS "Expense_stockMovementId_idx" ON "Expense"("stockMovementId");
CREATE INDEX IF NOT EXISTS "Expense_userId_reference_idx" ON "Expense"("userId", "reference");
