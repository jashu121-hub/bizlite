CREATE TYPE "CostCalculationStatus" AS ENUM ('DRAFT', 'SAVED', 'APPLIED');

CREATE TABLE "ProductCostCalculation" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "productId" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit" TEXT NOT NULL DEFAULT 'pcs',
    "calculationDate" DATE NOT NULL,
    "notes" TEXT,
    "status" "CostCalculationStatus" NOT NULL DEFAULT 'DRAFT',
    "payload" JSONB NOT NULL,
    "totalBatchCost" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "costPerUnit" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "suggestedSellingPrice" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "grossMarginPct" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "expenseIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCostCalculation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductCostCalculation_userId_idx" ON "ProductCostCalculation"("userId");
CREATE INDEX "ProductCostCalculation_userId_status_idx" ON "ProductCostCalculation"("userId", "status");
CREATE INDEX "ProductCostCalculation_productId_idx" ON "ProductCostCalculation"("productId");
CREATE INDEX "ProductCostCalculation_userId_calculationDate_idx" ON "ProductCostCalculation"("userId", "calculationDate");

ALTER TABLE "ProductCostCalculation" ADD CONSTRAINT "ProductCostCalculation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductCostCalculation" ADD CONSTRAINT "ProductCostCalculation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
