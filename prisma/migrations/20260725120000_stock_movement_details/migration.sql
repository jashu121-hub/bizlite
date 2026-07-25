-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN IF NOT EXISTS "quantityBefore" INTEGER;
ALTER TABLE "StockMovement" ADD COLUMN IF NOT EXISTS "quantityAfter" INTEGER;
ALTER TABLE "StockMovement" ADD COLUMN IF NOT EXISTS "reason" TEXT;
ALTER TABLE "StockMovement" ADD COLUMN IF NOT EXISTS "reference" TEXT;
