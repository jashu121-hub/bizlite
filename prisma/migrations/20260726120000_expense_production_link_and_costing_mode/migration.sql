-- Costing mode: INVENTORY (sale-line COGS) vs SIMPLE (period PRODUCTION expenses as COGS)
CREATE TYPE "CostingMode" AS ENUM ('INVENTORY', 'SIMPLE');
CREATE TYPE "InventoryDestination" AS ENUM ('RAW_MATERIALS', 'WIP', 'FINISHED_GOODS', 'NONE');

ALTER TABLE "UserProfile"
ADD COLUMN "costingMode" "CostingMode" NOT NULL DEFAULT 'INVENTORY';

-- Optional production-cost linking on expenses
ALTER TABLE "Expense"
ADD COLUMN "productId" TEXT,
ADD COLUMN "productionQuantity" INTEGER,
ADD COLUMN "productionUnit" TEXT,
ADD COLUMN "productionUnitCost" DECIMAL(14,2),
ADD COLUMN "inventoryDestination" "InventoryDestination",
ADD COLUMN "productionBatch" TEXT,
ADD COLUMN "updateInventory" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Expense_productId_idx" ON "Expense"("productId");

ALTER TABLE "Expense"
ADD CONSTRAINT "Expense_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
