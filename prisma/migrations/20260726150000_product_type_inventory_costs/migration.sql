-- Product types and inventory cost ledger fields

DO $$ BEGIN
  CREATE TYPE "ProductType" AS ENUM ('RESALE', 'MANUFACTURED', 'SERVICE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE "StockMovementType" ADD VALUE IF NOT EXISTS 'PRODUCTION_RECEIPT';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "UserProfile"
ADD COLUMN IF NOT EXISTS "allowNegativeStock" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Product"
ADD COLUMN IF NOT EXISTS "productType" "ProductType" NOT NULL DEFAULT 'RESALE',
ADD COLUMN IF NOT EXISTS "unitOfMeasure" TEXT NOT NULL DEFAULT 'pcs',
ADD COLUMN IF NOT EXISTS "defaultPurchaseCost" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "standardProductionCost" DECIMAL(14,2) NOT NULL DEFAULT 0;

UPDATE "Product"
SET "defaultPurchaseCost" = "costPrice"
WHERE "defaultPurchaseCost" = 0 AND "costPrice" > 0;

CREATE INDEX IF NOT EXISTS "Product_userId_productType_idx" ON "Product"("userId", "productType");

ALTER TABLE "StockMovement"
ADD COLUMN IF NOT EXISTS "unitCost" DECIMAL(14,2),
ADD COLUMN IF NOT EXISTS "totalCost" DECIMAL(14,2),
ADD COLUMN IF NOT EXISTS "averageCostAfter" DECIMAL(14,2);
