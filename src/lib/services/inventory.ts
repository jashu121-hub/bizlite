import type { Prisma, StockMovementType } from '@prisma/client'

import { moneyNumber, prismaDecimal, type MoneyInput } from '@/lib/money'
import { weightedAverageCost } from '@/lib/product-cost'
import { toDateOnly } from '@/lib/dates'

export type StockReceiptInput = {
  userId: string
  productId: string
  quantity: number
  unitCost: MoneyInput
  type: StockMovementType
  date: string | Date
  reason?: string
  reference?: string | null
  notes?: string | null
  saleId?: string | null
  /** When true, update product.costPrice via WAC (inbound). Default true. */
  updateAverageCost?: boolean
}

export type StockIssueInput = {
  userId: string
  productId: string
  quantity: number
  /** Absolute unit cost snapshot used for COGS / movement. */
  unitCost: MoneyInput
  type: StockMovementType
  date: string | Date
  reason?: string
  reference?: string | null
  notes?: string | null
  saleId?: string | null
  allowNegative?: boolean
}

export function tracksInventory(productType: string | null | undefined): boolean {
  return productType !== 'SERVICE'
}

/**
 * Apply an inbound stock receipt with perpetual weighted-average costing.
 * Creates a costed StockMovement and updates product.currentStock (+ costPrice when requested).
 */
export async function applyStockReceipt(
  tx: Prisma.TransactionClient,
  input: StockReceiptInput,
) {
  const qty = Math.floor(Number(input.quantity))
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new Error('Quantity must be greater than zero')
  }
  const unitCostNum = moneyNumber(input.unitCost)
  if (unitCostNum < 0) throw new Error('Unit cost cannot be negative')

  const product = await tx.product.findFirst({
    where: { id: input.productId, userId: input.userId },
  })
  if (!product) throw new Error('Product not found')
  if (!tracksInventory(product.productType)) {
    throw new Error('Services cannot hold stock')
  }

  const before = product.currentStock
  const costBefore = moneyNumber(product.costPrice)
  const after = before + qty
  const updateAvg = input.updateAverageCost !== false
  const nextAvg = updateAvg
    ? weightedAverageCost(before, product.costPrice, qty, unitCostNum)
    : product.costPrice.toString()

  await tx.product.update({
    where: { id: product.id },
    data: {
      currentStock: after,
      ...(updateAvg ? { costPrice: prismaDecimal(nextAvg) } : {}),
    },
  })

  const movement = await tx.stockMovement.create({
    data: {
      userId: input.userId,
      productId: product.id,
      type: input.type,
      quantity: qty,
      quantityBefore: before,
      quantityAfter: after,
      unitCost: prismaDecimal(unitCostNum),
      totalCost: prismaDecimal(unitCostNum * qty),
      averageCostAfter: prismaDecimal(nextAvg),
      reason: input.reason || null,
      reference: input.reference || null,
      date: toDateOnly(input.date),
      notes: input.notes || null,
      saleId: input.saleId || null,
    },
  })

  return {
    productId: product.id,
    quantityBefore: before,
    costBefore,
    quantityAdded: qty,
    addedUnitCost: unitCostNum,
    quantityAfter: after,
    averageCostAfter: moneyNumber(nextAvg),
    movementId: movement.id,
  }
}

/**
 * Apply an outbound stock issue (sale, wastage, adjustment out).
 * Does not change weighted-average cost (perpetual WAC stays until next receipt).
 */
export async function applyStockIssue(
  tx: Prisma.TransactionClient,
  input: StockIssueInput,
) {
  const qty = Math.floor(Number(input.quantity))
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new Error('Quantity must be greater than zero')
  }
  const unitCostNum = moneyNumber(input.unitCost)
  if (unitCostNum < 0) throw new Error('Unit cost cannot be negative')

  const product = await tx.product.findFirst({
    where: { id: input.productId, userId: input.userId },
  })
  if (!product) throw new Error('Product not found')
  if (!tracksInventory(product.productType)) {
    throw new Error('Services cannot hold stock')
  }

  const before = product.currentStock
  const after = before - qty
  if (after < 0 && !input.allowNegative) {
    throw new Error(`Insufficient stock for ${product.name}. Available: ${before}`)
  }

  await tx.product.update({
    where: { id: product.id },
    data: { currentStock: after },
  })

  const movement = await tx.stockMovement.create({
    data: {
      userId: input.userId,
      productId: product.id,
      type: input.type,
      quantity: -qty,
      quantityBefore: before,
      quantityAfter: after,
      unitCost: prismaDecimal(unitCostNum),
      totalCost: prismaDecimal(unitCostNum * qty),
      averageCostAfter: product.costPrice,
      reason: input.reason || null,
      reference: input.reference || null,
      date: toDateOnly(input.date),
      notes: input.notes || null,
      saleId: input.saleId || null,
    },
  })

  return {
    productId: product.id,
    quantityBefore: before,
    quantityAfter: after,
    unitCost: unitCostNum,
    movementId: movement.id,
  }
}

export function productionReceiptReference(calculationId: string): string {
  return `COSTCALC:${calculationId}`
}
