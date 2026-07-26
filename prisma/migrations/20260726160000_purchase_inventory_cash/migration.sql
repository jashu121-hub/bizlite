-- Purchase inventory receipt + cash payment (not an operating expense)

DO $$ BEGIN
  ALTER TYPE "StockMovementType" ADD VALUE IF NOT EXISTS 'PURCHASE';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE "CashTransactionType" ADD VALUE IF NOT EXISTS 'PURCHASE_PAYMENT';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "CashTransaction"
ADD COLUMN IF NOT EXISTS "stockMovementId" TEXT;

CREATE INDEX IF NOT EXISTS "CashTransaction_stockMovementId_idx"
ON "CashTransaction"("stockMovementId");
