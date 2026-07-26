import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { moneyNumber } from '@/lib/money'
import { toDateOnly } from '@/lib/dates'

export type DuplicateCostMatch = {
  source:
    | 'expense'
    | 'stock_purchase'
    | 'production_receipt'
    | 'purchase_payment'
    | 'cost_calculation'
  id: string
  label: string
  href: string
  amount: number | null
  date: string | null
  reference: string | null
  vendor: string | null
}

export type DuplicateCostCheckInput = {
  userId: string
  date: string
  amount: number | string
  vendor?: string | null
  reference?: string | null
  costCalculationId?: string | null
  stockMovementId?: string | null
  /** When editing, ignore this expense id. */
  excludeExpenseId?: string | null
}

/**
 * Detect whether the same business cost may already be recorded as inventory,
 * production, payment, or another expense (by reference IDs and invoice match).
 */
export async function findPotentialDuplicateCosts(
  input: DuplicateCostCheckInput,
  tx: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<DuplicateCostMatch[]> {
  const matches: DuplicateCostMatch[] = []
  const amount = moneyNumber(input.amount)
  const date = toDateOnly(input.date)
  const reference = input.reference?.trim() || null
  const vendor = input.vendor?.trim() || null

  if (input.costCalculationId) {
    const calc = await tx.productCostCalculation.findFirst({
      where: { id: input.costCalculationId, userId: input.userId },
      select: { id: true, name: true, totalBatchCost: true, calculationDate: true },
    })
    if (calc) {
      const receipt = await tx.stockMovement.findFirst({
        where: {
          userId: input.userId,
          type: 'PRODUCTION_RECEIPT',
          OR: [
            { reference: `COSTCALC:${calc.id}` },
            { reference: calc.id },
            { notes: { contains: calc.id } },
          ],
        },
        select: { id: true, totalCost: true, date: true, reference: true },
      })
      if (receipt) {
        matches.push({
          source: 'production_receipt',
          id: receipt.id,
          label: `Production stock already added for “${calc.name}”`,
          href: '/cost-pricing',
          amount: receipt.totalCost ? moneyNumber(receipt.totalCost) : moneyNumber(calc.totalBatchCost),
          date: receipt.date.toISOString().slice(0, 10),
          reference: receipt.reference,
          vendor: null,
        })
      }

      const linkedExpenses = await tx.expense.findMany({
        where: {
          userId: input.userId,
          costCalculationId: calc.id,
          ...(input.excludeExpenseId ? { id: { not: input.excludeExpenseId } } : {}),
        },
        select: {
          id: true,
          description: true,
          amount: true,
          date: true,
          reference: true,
          vendor: true,
          ledgerKind: true,
        },
        take: 5,
      })
      for (const row of linkedExpenses) {
        matches.push({
          source: 'expense',
          id: row.id,
          label: `${row.ledgerKind === 'PRODUCTION_PAYMENT' ? 'Production payment' : 'Expense'}: ${row.description}`,
          href: `/expenses/${row.id}/edit`,
          amount: moneyNumber(row.amount),
          date: row.date.toISOString().slice(0, 10),
          reference: row.reference,
          vendor: row.vendor,
        })
      }
    }
  }

  if (input.stockMovementId) {
    const movement = await tx.stockMovement.findFirst({
      where: { id: input.stockMovementId, userId: input.userId },
      select: {
        id: true,
        type: true,
        totalCost: true,
        date: true,
        reference: true,
        product: { select: { name: true } },
      },
    })
    if (movement) {
      matches.push({
        source: movement.type === 'PURCHASE' ? 'stock_purchase' : 'production_receipt',
        id: movement.id,
        label: `Stock movement for ${movement.product.name}`,
        href: '/products',
        amount: movement.totalCost ? moneyNumber(movement.totalCost) : null,
        date: movement.date.toISOString().slice(0, 10),
        reference: movement.reference,
        vendor: null,
      })
    }
  }

  if (reference) {
    const byRefExpenses = await tx.expense.findMany({
      where: {
        userId: input.userId,
        reference,
        ...(input.excludeExpenseId ? { id: { not: input.excludeExpenseId } } : {}),
      },
      select: {
        id: true,
        description: true,
        amount: true,
        date: true,
        reference: true,
        vendor: true,
        ledgerKind: true,
      },
      take: 5,
    })
    for (const row of byRefExpenses) {
      if (matches.some((m) => m.id === row.id)) continue
      matches.push({
        source: 'expense',
        id: row.id,
        label: `Existing ${row.ledgerKind === 'OPERATING' ? 'expense' : 'cost record'}: ${row.description}`,
        href: `/expenses/${row.id}/edit`,
        amount: moneyNumber(row.amount),
        date: row.date.toISOString().slice(0, 10),
        reference: row.reference,
        vendor: row.vendor,
      })
    }

    const byRefMovements = await tx.stockMovement.findMany({
      where: { userId: input.userId, reference },
      select: {
        id: true,
        type: true,
        totalCost: true,
        date: true,
        reference: true,
        product: { select: { name: true } },
      },
      take: 5,
    })
    for (const movement of byRefMovements) {
      if (matches.some((m) => m.id === movement.id)) continue
      matches.push({
        source: movement.type === 'PURCHASE' ? 'stock_purchase' : 'production_receipt',
        id: movement.id,
        label: `${movement.type.replaceAll('_', ' ')} · ${movement.product.name}`,
        href: '/products',
        amount: movement.totalCost ? moneyNumber(movement.totalCost) : null,
        date: movement.date.toISOString().slice(0, 10),
        reference: movement.reference,
        vendor: null,
      })
    }
  }

  // Soft match: same date + amount + vendor (common duplicate invoice pattern)
  if (amount > 0) {
    const softExpenses = await tx.expense.findMany({
      where: {
        userId: input.userId,
        date,
        amount: amount.toFixed(2),
        ...(vendor ? { vendor: { equals: vendor, mode: 'insensitive' } } : {}),
        ...(input.excludeExpenseId ? { id: { not: input.excludeExpenseId } } : {}),
      },
      select: {
        id: true,
        description: true,
        amount: true,
        date: true,
        reference: true,
        vendor: true,
        ledgerKind: true,
      },
      take: 5,
    })
    for (const row of softExpenses) {
      if (matches.some((m) => m.id === row.id)) continue
      matches.push({
        source: 'expense',
        id: row.id,
        label: `Similar expense on same date/amount: ${row.description}`,
        href: `/expenses/${row.id}/edit`,
        amount: moneyNumber(row.amount),
        date: row.date.toISOString().slice(0, 10),
        reference: row.reference,
        vendor: row.vendor,
      })
    }

    if (vendor || reference) {
      const softPurchases = await tx.stockMovement.findMany({
        where: {
          userId: input.userId,
          type: 'PURCHASE',
          date,
          totalCost: amount.toFixed(2),
          ...(reference ? { reference } : {}),
          ...(vendor
            ? {
                OR: [
                  { notes: { contains: vendor, mode: 'insensitive' } },
                  { reason: { contains: vendor, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
        select: {
          id: true,
          totalCost: true,
          date: true,
          reference: true,
          notes: true,
          product: { select: { name: true } },
        },
        take: 5,
      })
      for (const movement of softPurchases) {
        if (matches.some((m) => m.id === movement.id)) continue
        matches.push({
          source: 'stock_purchase',
          id: movement.id,
          label: `Inventory purchase already recorded for ${movement.product.name}`,
          href: '/products',
          amount: movement.totalCost ? moneyNumber(movement.totalCost) : amount,
          date: movement.date.toISOString().slice(0, 10),
          reference: movement.reference,
          vendor,
        })
      }
    }
  }

  return matches
}

export const DUPLICATE_COST_WARNING =
  'This cost may already be recorded through inventory or production. Recording it again as an operating expense may duplicate the cost.'
