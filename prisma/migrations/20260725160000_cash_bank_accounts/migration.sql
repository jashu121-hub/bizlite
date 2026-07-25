-- CreateEnum
CREATE TYPE "CashAccountType" AS ENUM ('CASH', 'BANK', 'OTHER');

-- CreateEnum
CREATE TYPE "CashBalanceSource" AS ENUM ('OWNER_CAPITAL', 'PREVIOUS_BUSINESS_BALANCE', 'LOAN_RECEIVED', 'OTHER_FUNDING');

-- CreateEnum
CREATE TYPE "CashTransactionType" AS ENUM ('OPENING_BALANCE', 'STARTING_BALANCE', 'MONEY_IN', 'MONEY_OUT', 'TRANSFER_IN', 'TRANSFER_OUT', 'SALE_RECEIPT', 'EXPENSE_PAYMENT', 'CUSTOMER_PAYMENT', 'BALANCE_ADJUSTMENT');

-- CreateTable
CREATE TABLE "CashAccount" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CashAccountType" NOT NULL,
    "bankName" TEXT,
    "accountNumber" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "currentBalance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashTransaction" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "accountId" TEXT NOT NULL,
    "type" "CashTransactionType" NOT NULL,
    "date" DATE NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "balanceSource" "CashBalanceSource",
    "reference" TEXT,
    "notes" TEXT,
    "transferGroupId" TEXT,
    "saleId" TEXT,
    "expenseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashTransaction_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN "cashAccountId" TEXT;

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN "cashAccountId" TEXT;

-- CreateIndex
CREATE INDEX "CashAccount_userId_idx" ON "CashAccount"("userId");

-- CreateIndex
CREATE INDEX "CashAccount_userId_isActive_idx" ON "CashAccount"("userId", "isActive");

-- CreateIndex
CREATE INDEX "CashAccount_userId_type_idx" ON "CashAccount"("userId", "type");

-- CreateIndex
CREATE INDEX "CashTransaction_userId_idx" ON "CashTransaction"("userId");

-- CreateIndex
CREATE INDEX "CashTransaction_accountId_idx" ON "CashTransaction"("accountId");

-- CreateIndex
CREATE INDEX "CashTransaction_userId_date_idx" ON "CashTransaction"("userId", "date");

-- CreateIndex
CREATE INDEX "CashTransaction_saleId_idx" ON "CashTransaction"("saleId");

-- CreateIndex
CREATE INDEX "CashTransaction_expenseId_idx" ON "CashTransaction"("expenseId");

-- CreateIndex
CREATE INDEX "CashTransaction_transferGroupId_idx" ON "CashTransaction"("transferGroupId");

-- CreateIndex
CREATE INDEX "Sale_cashAccountId_idx" ON "Sale"("cashAccountId");

-- CreateIndex
CREATE INDEX "Expense_cashAccountId_idx" ON "Expense"("cashAccountId");

-- AddForeignKey
ALTER TABLE "CashAccount" ADD CONSTRAINT "CashAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashTransaction" ADD CONSTRAINT "CashTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashTransaction" ADD CONSTRAINT "CashTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CashAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_cashAccountId_fkey" FOREIGN KEY ("cashAccountId") REFERENCES "CashAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_cashAccountId_fkey" FOREIGN KEY ("cashAccountId") REFERENCES "CashAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
