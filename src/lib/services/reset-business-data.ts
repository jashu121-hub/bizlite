import type { Prisma } from '@prisma/client'

import { ensureExpenseCategories } from '@/lib/expense-categories'
import { moneyNumber } from '@/lib/money'
import { prisma } from '@/lib/prisma'

export type ResetMode = 'transactions' | 'full'

export type ResetOptions = {
  mode: ResetMode
  resetInvoiceNumbering: boolean
  resetExpenseNumbering: boolean
  resetProductSkuNumbering: boolean
  keepDefaultSystemCategories: boolean
}

export type ResetValidation = {
  sales: number
  expenses: number
  cogs: number
  pendingPayments: number
  stockValue: number
  productCount: number
  customerCount: number
  cashBalance: number
  bankBalance: number
  archivedProducts: number
  stockMovements: number
  costCalculations: number
  cashTransactions: number
  ok: boolean
}

async function wipeTransactions(
  tx: Prisma.TransactionClient,
  userId: string,
  options: { zeroProductStock: boolean; zeroCashBalances: boolean },
) {
  // Dependent records first to avoid FK issues.
  await tx.customerPayment.deleteMany({ where: { userId } })
  await tx.cashTransaction.deleteMany({ where: { userId } })
  await tx.stockMovement.deleteMany({ where: { userId } })
  // SaleItem cascades from Sale
  await tx.sale.deleteMany({ where: { userId } })
  await tx.expense.deleteMany({ where: { userId } })
  await tx.productCostCalculation.deleteMany({ where: { userId } })

  if (options.zeroProductStock) {
    await tx.product.updateMany({
      where: { userId },
      data: {
        currentStock: 0,
        openingStock: 0,
      },
    })
  }

  if (options.zeroCashBalances) {
    await tx.cashAccount.updateMany({
      where: { userId },
      data: { currentBalance: 0 },
    })
  }
}

async function wipeMasterData(
  tx: Prisma.TransactionClient,
  userId: string,
  options: ResetOptions,
) {
  await tx.customer.deleteMany({ where: { userId } })
  await tx.product.deleteMany({ where: { userId } })
  await tx.cashAccount.deleteMany({ where: { userId } })

  if (options.keepDefaultSystemCategories) {
    // Remove user-created categories only (systemKey is null).
    // Children of user categories first if any parent is user-created.
    await tx.expenseCategoryItem.deleteMany({
      where: { userId, systemKey: null },
    })
    await ensureExpenseCategories(userId, tx)
  } else {
    await tx.expenseCategoryItem.deleteMany({ where: { userId } })
    // Recreate system categories so the app remains usable.
    await ensureExpenseCategories(userId, tx)
  }

  if (options.resetProductSkuNumbering) {
    // No sequential SKU counter exists; SKUs are cleared with products on full reset.
  }
}

export async function resetBusinessData(userId: string, options: ResetOptions) {
  await prisma.$transaction(
    async (tx) => {
      await wipeTransactions(tx, userId, {
        zeroProductStock: true,
        zeroCashBalances: true,
      })

      if (options.mode === 'full') {
        await wipeMasterData(tx, userId, options)
      } else if (options.resetProductSkuNumbering) {
        // Optional: clear SKUs on remaining products for a clean restart.
        await tx.product.updateMany({
          where: { userId },
          data: { sku: null },
        })
      }

      // Invoice numbering restarts automatically once sales are deleted
      // (nextInvoiceNumber → INV-{year}-00001). Expense numbering has no
      // sequence table in BizLite; deleting expenses clears that history.
      void options.resetInvoiceNumbering
      void options.resetExpenseNumbering
    },
    { maxWait: 15_000, timeout: 60_000 },
  )

  return validateResetState(userId, options.mode)
}

export async function validateResetState(
  userId: string,
  mode: ResetMode,
): Promise<ResetValidation> {
  const [
    salesAgg,
    expenseAgg,
    pendingAgg,
    products,
    customerCount,
    cashAccounts,
    archivedProducts,
    stockMovements,
    costCalculations,
    cashTransactions,
  ] = await Promise.all([
    prisma.sale.aggregate({
      where: { userId },
      _sum: { totalAmount: true, totalCost: true },
      _count: true,
    }),
    prisma.expense.aggregate({
      where: { userId },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.sale.aggregate({
      where: { userId, balancePending: { gt: 0 } },
      _sum: { balancePending: true },
    }),
    prisma.product.findMany({
      where: { userId },
      select: { currentStock: true, costPrice: true, isActive: true },
    }),
    prisma.customer.count({ where: { userId } }),
    prisma.cashAccount.findMany({
      where: { userId },
      select: { type: true, currentBalance: true },
    }),
    prisma.product.count({ where: { userId, isActive: false } }),
    prisma.stockMovement.count({ where: { userId } }),
    prisma.productCostCalculation.count({ where: { userId } }),
    prisma.cashTransaction.count({ where: { userId } }),
  ])

  const stockValue = products.reduce(
    (sum, p) => sum + moneyNumber(p.costPrice) * p.currentStock,
    0,
  )
  const cashBalance = cashAccounts
    .filter((a) => a.type === 'CASH')
    .reduce((sum, a) => sum + moneyNumber(a.currentBalance), 0)
  const bankBalance = cashAccounts
    .filter((a) => a.type === 'BANK')
    .reduce((sum, a) => sum + moneyNumber(a.currentBalance), 0)

  const sales = moneyNumber(salesAgg._sum.totalAmount || 0)
  const expenses = moneyNumber(expenseAgg._sum.amount || 0)
  const cogs = moneyNumber(salesAgg._sum.totalCost || 0)
  const pendingPayments = moneyNumber(pendingAgg._sum.balancePending || 0)
  const productCount = products.length

  const ok =
    sales === 0 &&
    expenses === 0 &&
    cogs === 0 &&
    pendingPayments === 0 &&
    stockValue === 0 &&
    stockMovements === 0 &&
    costCalculations === 0 &&
    cashTransactions === 0 &&
    cashBalance === 0 &&
    bankBalance === 0 &&
    (mode === 'full'
      ? productCount === 0 && customerCount === 0 && archivedProducts === 0
      : products.every((p) => p.currentStock === 0))

  return {
    sales,
    expenses,
    cogs,
    pendingPayments,
    stockValue,
    productCount,
    customerCount,
    cashBalance,
    bankBalance,
    archivedProducts,
    stockMovements,
    costCalculations,
    cashTransactions,
    ok,
  }
}

/** Build a JSON backup payload for download before reset. */
export async function buildBusinessDataBackup(userId: string) {
  const [
    profile,
    products,
    customers,
    sales,
    expenses,
    cashAccounts,
    cashTransactions,
    stockMovements,
    costCalculations,
    categories,
    payments,
  ] = await Promise.all([
    prisma.userProfile.findUnique({
      where: { id: userId },
      select: {
        businessName: true,
        ownerName: true,
        phone: true,
        currency: true,
        costingMode: true,
        email: true,
      },
    }),
    prisma.product.findMany({ where: { userId } }),
    prisma.customer.findMany({ where: { userId } }),
    prisma.sale.findMany({
      where: { userId },
      include: { items: true },
    }),
    prisma.expense.findMany({ where: { userId } }),
    prisma.cashAccount.findMany({ where: { userId } }),
    prisma.cashTransaction.findMany({ where: { userId } }),
    prisma.stockMovement.findMany({ where: { userId } }),
    prisma.productCostCalculation.findMany({ where: { userId } }),
    prisma.expenseCategoryItem.findMany({ where: { userId } }),
    prisma.customerPayment.findMany({ where: { userId } }),
  ])

  return {
    exportedAt: new Date().toISOString(),
    app: 'BizLite 2026',
    profile,
    products,
    customers,
    sales,
    expenses,
    cashAccounts,
    cashTransactions,
    stockMovements,
    costCalculations,
    categories,
    payments,
  }
}
