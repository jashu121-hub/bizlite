-- CreateTable
CREATE TABLE IF NOT EXISTS "ExpenseCategoryItem" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "defaultCostType" "ExpenseCostType",
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "isTransport" BOOLEAN NOT NULL DEFAULT false,
    "parentId" TEXT,
    "systemKey" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExpenseCategoryItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ExpenseCategoryItem_userId_name_key" ON "ExpenseCategoryItem"("userId", "name");
CREATE INDEX IF NOT EXISTS "ExpenseCategoryItem_userId_idx" ON "ExpenseCategoryItem"("userId");
CREATE INDEX IF NOT EXISTS "ExpenseCategoryItem_userId_isArchived_idx" ON "ExpenseCategoryItem"("userId", "isArchived");
CREATE INDEX IF NOT EXISTS "ExpenseCategoryItem_userId_parentId_idx" ON "ExpenseCategoryItem"("userId", "parentId");
CREATE INDEX IF NOT EXISTS "ExpenseCategoryItem_userId_systemKey_idx" ON "ExpenseCategoryItem"("userId", "systemKey");

DO $$ BEGIN
  ALTER TABLE "ExpenseCategoryItem"
    ADD CONSTRAINT "ExpenseCategoryItem_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ExpenseCategoryItem"
    ADD CONSTRAINT "ExpenseCategoryItem_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES "ExpenseCategoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Seed default categories for every existing user
INSERT INTO "ExpenseCategoryItem" ("id", "userId", "name", "defaultCostType", "isArchived", "isTransport", "parentId", "systemKey", "sortOrder", "createdAt", "updatedAt")
SELECT
  md5(u."id"::text || ':' || d.key)::text,
  u."id",
  d.name,
  CASE WHEN d.cost_type IS NULL THEN NULL ELSE d.cost_type::"ExpenseCostType" END,
  false,
  d.is_transport,
  NULL,
  d.key,
  d.sort_order,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "UserProfile" u
CROSS JOIN (
  VALUES
    ('MATERIALS', 'Materials', 'PRODUCTION'::text, false, 10),
    ('PACKAGING', 'Packaging', 'PRODUCTION'::text, false, 20),
    ('TRANSPORT', 'Transport', NULL::text, true, 30),
    ('MARKETING', 'Marketing', 'SELLING'::text, false, 40),
    ('SALARY', 'Salary', 'OVERHEAD'::text, false, 50),
    ('UTILITIES', 'Utilities', 'OVERHEAD'::text, false, 60),
    ('RENT', 'Rent', 'OVERHEAD'::text, false, 70),
    ('MAINTENANCE', 'Maintenance', 'OVERHEAD'::text, false, 80),
    ('OTHER', 'Other', 'OVERHEAD'::text, false, 90)
) AS d(key, name, cost_type, is_transport, sort_order)
ON CONFLICT ("userId", "name") DO NOTHING;

-- Seed transport subcategories
INSERT INTO "ExpenseCategoryItem" ("id", "userId", "name", "defaultCostType", "isArchived", "isTransport", "parentId", "systemKey", "sortOrder", "createdAt", "updatedAt")
SELECT
  md5(u."id"::text || ':' || d.key)::text,
  u."id",
  d.name,
  d.cost_type::"ExpenseCostType",
  false,
  false,
  md5(u."id"::text || ':TRANSPORT')::text,
  d.key,
  d.sort_order,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "UserProfile" u
CROSS JOIN (
  VALUES
    ('INWARD_TRANSPORT', 'Inward Transport', 'PRODUCTION', 31),
    ('CUSTOMER_DELIVERY', 'Customer Delivery', 'SELLING', 32),
    ('GENERAL_TRANSPORT', 'General Business Transport', 'OVERHEAD', 33)
) AS d(key, name, cost_type, sort_order)
ON CONFLICT ("userId", "name") DO NOTHING;

-- Add new Expense.categoryId
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "categoryId" TEXT;

-- Backfill non-transport expenses from legacy enum column when present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Expense' AND column_name = 'category'
  ) THEN
    UPDATE "Expense" e
    SET "categoryId" = md5(e."userId"::text || ':' || e."category"::text)
    WHERE e."categoryId" IS NULL
      AND e."category"::text <> 'TRANSPORT';

    -- Transport with subcategory
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'Expense' AND column_name = 'subcategory'
    ) THEN
      UPDATE "Expense" e
      SET "categoryId" = md5(e."userId"::text || ':' || e."subcategory"::text)
      WHERE e."categoryId" IS NULL
        AND e."category"::text = 'TRANSPORT'
        AND e."subcategory" IS NOT NULL;

      -- Transport without subcategory → parent Transport (needs classification)
      UPDATE "Expense" e
      SET "categoryId" = md5(e."userId"::text || ':TRANSPORT')
      WHERE e."categoryId" IS NULL
        AND e."category"::text = 'TRANSPORT';
    ELSE
      UPDATE "Expense" e
      SET "categoryId" = md5(e."userId"::text || ':TRANSPORT')
      WHERE e."categoryId" IS NULL
        AND e."category"::text = 'TRANSPORT';
    END IF;
  END IF;
END $$;

-- Fallback: any remaining nulls → Other
UPDATE "Expense"
SET "categoryId" = md5("userId"::text || ':OTHER')
WHERE "categoryId" IS NULL;

-- Drop legacy columns
ALTER TABLE "Expense" DROP COLUMN IF EXISTS "subcategory";
ALTER TABLE "Expense" DROP COLUMN IF EXISTS "category";

-- Enforce categoryId
ALTER TABLE "Expense" ALTER COLUMN "categoryId" SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE "Expense"
    ADD CONSTRAINT "Expense_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "Expense_userId_categoryId_idx" ON "Expense"("userId", "categoryId");
CREATE INDEX IF NOT EXISTS "Expense_categoryId_idx" ON "Expense"("categoryId");

-- Drop legacy enums if unused
DROP TYPE IF EXISTS "ExpenseSubcategory";
DROP TYPE IF EXISTS "ExpenseCategory";
