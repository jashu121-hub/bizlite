-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "ExpenseCostType" AS ENUM ('PRODUCTION', 'SELLING', 'OVERHEAD');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ExpenseSubcategory" AS ENUM ('INWARD_TRANSPORT', 'CUSTOMER_DELIVERY', 'GENERAL_TRANSPORT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN IF NOT EXISTS "expenseCostDefaults" JSONB;

ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "costType" "ExpenseCostType";
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "subcategory" "ExpenseSubcategory";
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "vendor" TEXT;
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "reference" TEXT;

-- Backfill historical non-transport expenses
UPDATE "Expense"
SET "costType" = 'PRODUCTION'
WHERE "costType" IS NULL
  AND "category" IN ('MATERIALS', 'PACKAGING');

UPDATE "Expense"
SET "costType" = 'SELLING'
WHERE "costType" IS NULL
  AND "category" = 'MARKETING';

UPDATE "Expense"
SET "costType" = 'OVERHEAD'
WHERE "costType" IS NULL
  AND "category" IN ('SALARY', 'UTILITIES', 'RENT', 'MAINTENANCE', 'OTHER');

-- TRANSPORT left unclassified until the user chooses a subcategory

CREATE INDEX IF NOT EXISTS "Expense_userId_costType_idx" ON "Expense"("userId", "costType");
