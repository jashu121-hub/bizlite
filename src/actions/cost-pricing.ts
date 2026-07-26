'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { requireProfile } from '@/lib/auth'
import { fail, ok } from '@/lib/action-result'
import { prisma } from '@/lib/prisma'
import { moneyNumber, prismaDecimal } from '@/lib/money'
import { toDateOnly } from '@/lib/dates'
import { computeCostPricing } from '@/lib/cost-pricing/compute'
import { createDefaultPayload } from '@/lib/cost-pricing/defaults'
import { payloadToProductCostBreakdown } from '@/lib/cost-pricing/map-to-product'
import type { CostPricingPayload } from '@/lib/cost-pricing/types'
import { normalizeCostBreakdown } from '@/lib/product-cost'
import {
  applyStockReceipt,
  productionReceiptReference,
  tracksInventory,
} from '@/lib/services/inventory'
import { z } from 'zod'

function revalidateCostPaths(productId?: string | null) {
  revalidatePath('/cost-pricing')
  revalidatePath('/products')
  revalidatePath('/dashboard')
  revalidatePath('/reports')
  revalidatePath('/expenses')
  if (productId) revalidatePath(`/products/${productId}`)
}

const payloadSchema = z.object({
  productId: z.string().optional().or(z.literal('')),
  name: z.string().min(1, 'Calculation name is required').max(160),
  category: z.string().max(120).optional().or(z.literal('')),
  quantity: z.coerce
    .number()
    .int()
    .positive('Finished quantity produced must be greater than zero'),
  unit: z.string().min(1).max(40),
  calculationDate: z.string().min(1),
  notes: z.string().max(2000).optional().or(z.literal('')),
  lines: z.array(z.any()).min(1, 'Add at least one cost component'),
  wastageMode: z.enum(['materialPct', 'finishedQty']).optional(),
  wastagePct: z.string().optional().or(z.literal('')),
  finishedWastageQty: z.string().optional().or(z.literal('')),
  contingencyPct: z.string().optional().or(z.literal('')),
  additionalFixedCost: z.string().optional().or(z.literal('')),
  overheadMethod: z.enum(['fixed', 'perUnit', 'percent']),
  overheadValue: z.string().optional().or(z.literal('')),
  overheadLabel: z.string().max(160).optional().or(z.literal('')),
  pricingMode: z.enum(['markup', 'margin', 'manual']),
  targetMarkupPct: z.string().optional().or(z.literal('')),
  targetMarginPct: z.string().optional().or(z.literal('')),
  manualSellingPrice: z.string().optional().or(z.literal('')),
  sellingCosts: z.object({
    deliveryPerUnit: z.string().optional().or(z.literal('')),
    commissionPct: z.string().optional().or(z.literal('')),
    marketplaceFeePct: z.string().optional().or(z.literal('')),
    cardFeePct: z.string().optional().or(z.literal('')),
    otherPerUnit: z.string().optional().or(z.literal('')),
  }),
  scenarios: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      sellingPrice: z.string().optional().or(z.literal('')),
    }),
  ),
})

function asPayload(raw: unknown): CostPricingPayload {
  const parsed = payloadSchema.parse(raw)
  return createDefaultPayload(parsed as Partial<CostPricingPayload>)
}

export async function listCostCalculationsAction() {
  try {
    const { user } = await requireProfile()
    const rows = await prisma.productCostCalculation.findMany({
      where: { userId: user.id },
      orderBy: [{ calculationDate: 'desc' }, { updatedAt: 'desc' }],
      include: { product: { select: { id: true, name: true } } },
      take: 100,
    })
    return ok(
      rows.map((r) => ({
        id: r.id,
        name: r.name,
        productId: r.productId,
        productName: r.product?.name ?? null,
        quantity: r.quantity,
        unit: r.unit,
        calculationDate: r.calculationDate.toISOString().slice(0, 10),
        status: r.status,
        totalBatchCost: r.totalBatchCost.toString(),
        costPerUnit: r.costPerUnit.toString(),
        suggestedSellingPrice: r.suggestedSellingPrice.toString(),
        grossMarginPct: r.grossMarginPct.toString(),
        expenseIds: r.expenseIds,
        updatedAt: r.updatedAt.toISOString(),
      })),
    )
  } catch (error) {
    console.error('listCostCalculationsAction', error)
    return fail('Unable to load saved calculations')
  }
}

export async function getCostCalculationAction(id: string) {
  try {
    const { user } = await requireProfile()
    const row = await prisma.productCostCalculation.findFirst({
      where: { id, userId: user.id },
      include: { product: { select: { id: true, name: true, category: true } } },
    })
    if (!row) return fail('Calculation not found')
    return ok({
      id: row.id,
      status: row.status,
      expenseIds: row.expenseIds,
      payload: row.payload as CostPricingPayload,
      productName: row.product?.name ?? null,
    })
  } catch (error) {
    console.error('getCostCalculationAction', error)
    return fail('Unable to load calculation')
  }
}

export async function saveCostCalculationAction(raw: {
  id?: string
  status?: 'DRAFT' | 'SAVED'
  payload: unknown
}) {
  try {
    const { user } = await requireProfile()
    const payload = asPayload(raw.payload)
    const totals = computeCostPricing(payload)
    if (!totals.validation.ok) {
      return fail(totals.validation.messages[0] || 'Validation failed')
    }
    if (payload.productId) {
      const product = await prisma.product.findFirst({
        where: { id: payload.productId, userId: user.id },
        select: { id: true },
      })
      if (!product) return fail('Selected product was not found')
    }

    const status = raw.status === 'DRAFT' ? 'DRAFT' : 'SAVED'
    const data = {
      productId: payload.productId || null,
      name: payload.name.trim(),
      category: payload.category?.trim() || null,
      quantity: payload.quantity,
      unit: payload.unit,
      calculationDate: toDateOnly(payload.calculationDate),
      notes: payload.notes?.trim() || null,
      status: status as 'DRAFT' | 'SAVED',
      payload: payload as unknown as Prisma.InputJsonValue,
      totalBatchCost: prismaDecimal(totals.totalBatchCost),
      costPerUnit: prismaDecimal(totals.costPerUnit),
      suggestedSellingPrice: prismaDecimal(totals.suggestedSellingPrice),
      grossMarginPct: prismaDecimal(totals.grossMarginPct),
    }

    if (raw.id) {
      const existing = await prisma.productCostCalculation.findFirst({
        where: { id: raw.id, userId: user.id },
      })
      if (!existing) return fail('Calculation not found')
      const updated = await prisma.productCostCalculation.update({
        where: { id: raw.id },
        data,
      })
      revalidateCostPaths(payload.productId)
      return ok({ id: updated.id }, status === 'DRAFT' ? 'Draft saved' : 'Calculation saved')
    }

    const created = await prisma.productCostCalculation.create({
      data: { userId: user.id, ...data },
    })
    revalidateCostPaths(payload.productId)
    return ok({ id: created.id }, status === 'DRAFT' ? 'Draft saved' : 'Calculation saved')
  } catch (error) {
    console.error('saveCostCalculationAction', error)
    if (error instanceof z.ZodError) {
      return fail(error.issues[0]?.message || 'Invalid calculation')
    }
    return fail('Unable to save calculation')
  }
}

export async function duplicateCostCalculationAction(id: string) {
  try {
    const { user } = await requireProfile()
    const existing = await prisma.productCostCalculation.findFirst({
      where: { id, userId: user.id },
    })
    if (!existing) return fail('Calculation not found')
    const payload = existing.payload as CostPricingPayload
    const copyName = `${existing.name} (copy)`
    const created = await prisma.productCostCalculation.create({
      data: {
        userId: user.id,
        productId: existing.productId,
        name: copyName,
        category: existing.category,
        quantity: existing.quantity,
        unit: existing.unit,
        calculationDate: toDateOnly(new Date()),
        notes: existing.notes,
        status: 'DRAFT',
        payload: { ...payload, name: copyName } as unknown as Prisma.InputJsonValue,
        totalBatchCost: existing.totalBatchCost,
        costPerUnit: existing.costPerUnit,
        suggestedSellingPrice: existing.suggestedSellingPrice,
        grossMarginPct: existing.grossMarginPct,
        expenseIds: [],
      },
    })
    revalidateCostPaths(existing.productId)
    return ok({ id: created.id }, 'Calculation duplicated')
  } catch (error) {
    console.error('duplicateCostCalculationAction', error)
    return fail('Unable to duplicate calculation')
  }
}

export async function deleteCostCalculationAction(id: string) {
  try {
    const { user } = await requireProfile()
    const existing = await prisma.productCostCalculation.findFirst({
      where: { id, userId: user.id },
    })
    if (!existing) return fail('Calculation not found')
    await prisma.productCostCalculation.delete({ where: { id } })
    revalidateCostPaths(existing.productId)
    return ok({ id }, 'Calculation deleted')
  } catch (error) {
    console.error('deleteCostCalculationAction', error)
    return fail('Unable to delete calculation')
  }
}

export async function applyCostPricingToProductAction(raw: {
  calculationId?: string
  productId: string
  applyCost: boolean
  applyPrice: boolean
  payload: unknown
}) {
  try {
    const { user } = await requireProfile()
    if (!raw.applyCost && !raw.applyPrice) {
      return fail('Choose cost, selling price, or both')
    }
    const payload = asPayload(raw.payload)
    const totals = computeCostPricing(payload)
    if (!totals.validation.ok) {
      return fail(totals.validation.messages[0] || 'Validation failed')
    }

    const product = await prisma.product.findFirst({
      where: { id: raw.productId, userId: user.id },
    })
    if (!product) return fail('Product not found')

    const breakdown = payloadToProductCostBreakdown(payload, totals)

    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: product.id },
        data: {
          ...(raw.applyCost
            ? {
                // Standard production cost for future batches only — does not revalue stock / WAC.
                standardProductionCost: prismaDecimal(totals.costPerUnit),
                costBreakdown: breakdown as unknown as Prisma.InputJsonValue,
                productType:
                  product.productType === 'SERVICE' ? product.productType : 'MANUFACTURED',
              }
            : {}),
          ...(raw.applyPrice
            ? { sellingPrice: prismaDecimal(totals.suggestedSellingPrice) }
            : {}),
        },
      })

      if (raw.calculationId) {
        const calc = await tx.productCostCalculation.findFirst({
          where: { id: raw.calculationId, userId: user.id },
        })
        if (calc) {
          await tx.productCostCalculation.update({
            where: { id: calc.id },
            data: {
              status: 'APPLIED',
              productId: product.id,
              totalBatchCost: prismaDecimal(totals.totalBatchCost),
              costPerUnit: prismaDecimal(totals.costPerUnit),
              suggestedSellingPrice: prismaDecimal(totals.suggestedSellingPrice),
              grossMarginPct: prismaDecimal(totals.grossMarginPct),
              payload: payload as unknown as Prisma.InputJsonValue,
            },
          })
        }
      }
    })

    // Historical sale lines / COGS snapshots are never updated here.
    revalidateCostPaths(product.id)
    revalidatePath('/sales')
    return ok(
      {
        productId: product.id,
        costPerUnit: totals.costPerUnit,
        sellingPrice: totals.suggestedSellingPrice,
      },
      raw.applyCost && !raw.applyPrice
        ? 'Set as standard production cost for future batches'
        : raw.applyPrice && !raw.applyCost
          ? 'Default selling price updated for future sales'
          : 'Applied to product for future transactions only',
    )
  } catch (error) {
    console.error('applyCostPricingToProductAction', error)
    if (error instanceof z.ZodError) {
      return fail(error.issues[0]?.message || 'Invalid calculation')
    }
    return fail('Unable to apply values to product')
  }
}

export async function addProducedStockFromCalculationAction(raw: {
  productId: string
  quantity: number
  unitCost: number
  productionDate: string
  batchReference?: string
  storageLocation?: string
  notes?: string
  calculationId?: string
  payload?: unknown
}) {
  try {
    const { user } = await requireProfile()
    const qty = Math.floor(Number(raw.quantity))
    if (!Number.isFinite(qty) || qty <= 0) return fail('Quantity produced must be greater than zero')
    const unitCost = Number(raw.unitCost)
    if (!Number.isFinite(unitCost) || unitCost < 0) return fail('Unit cost cannot be negative')

    const product = await prisma.product.findFirst({
      where: { id: raw.productId, userId: user.id },
    })
    if (!product) return fail('Product not found')
    if (!tracksInventory(product.productType)) {
      return fail('Services cannot receive production stock')
    }

    const calcRef = raw.calculationId
      ? productionReceiptReference(raw.calculationId)
      : null
    if (calcRef) {
      const duplicate = await prisma.stockMovement.findFirst({
        where: {
          userId: user.id,
          productId: product.id,
          type: 'PRODUCTION_RECEIPT',
          reference: calcRef,
        },
        select: { id: true },
      })
      if (duplicate) {
        return fail(
          'Production stock was already added from this calculation. Duplicate entries are blocked.',
        )
      }
    }

    let breakdownJson: Prisma.InputJsonValue | undefined
    let batchTotal = unitCost * qty
    if (raw.payload) {
      try {
        const payload = asPayload(raw.payload)
        const totals = computeCostPricing(payload)
        batchTotal = totals.totalBatchCost
        breakdownJson = payloadToProductCostBreakdown(
          payload,
          totals,
        ) as unknown as Prisma.InputJsonValue
      } catch {
        breakdownJson = undefined
      }
    }

    await prisma.$transaction(async (tx) => {
      const noteParts = [
        raw.storageLocation ? `Location: ${raw.storageLocation}` : null,
        raw.notes || null,
        `Batch cost: ${moneyNumber(batchTotal).toFixed(2)}`,
        raw.calculationId ? `Cost calc: ${raw.calculationId}` : null,
      ].filter(Boolean)

      const receipt = await applyStockReceipt(tx, {
        userId: user.id,
        productId: product.id,
        quantity: qty,
        unitCost,
        type: 'PRODUCTION_RECEIPT',
        date: raw.productionDate,
        reason: 'Production',
        reference: raw.batchReference || calcRef || null,
        notes: noteParts.join(' · ') || 'Production batch receipt',
      })

      await tx.product.update({
        where: { id: product.id },
        data: {
          standardProductionCost: prismaDecimal(unitCost),
          productType:
            product.productType === 'SERVICE' ? product.productType : 'MANUFACTURED',
          ...(breakdownJson
            ? {
                costBreakdown: normalizeCostBreakdown(
                  breakdownJson as never,
                ) as unknown as Prisma.InputJsonValue,
              }
            : {}),
        },
      })

      if (raw.calculationId) {
        await tx.productCostCalculation.updateMany({
          where: { id: raw.calculationId, userId: user.id },
          data: {
            status: 'APPLIED',
            productId: product.id,
          },
        })
      }

      return receipt
    })

    revalidateCostPaths(product.id)
    return ok(
      { inventoryValue: moneyNumber(prismaDecimal(unitCost).times(qty)) },
      'Production batch created and stock added',
    )
  } catch (error) {
    console.error('addProducedStockFromCalculationAction', error)
    return fail(error instanceof Error ? error.message : 'Unable to add produced stock')
  }
}

/**
 * Record production payment(s) for a saved cost calculation.
 * Creates PRODUCTION_PAYMENT ledger rows (not operating expenses) and posts cash if selected.
 * Does not add inventory — use Create Production Batch for that.
 */
export async function createProductionExpensesFromCalculationAction(raw: {
  calculationId: string
  expenseDate: string
  cashAccountId?: string
  paymentMethod?: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'OTHER'
  lineIds: string[]
  categoryId: string
  paymentMode?: 'PAID' | 'UNPAID'
}) {
  try {
    const { user } = await requireProfile()
    const calc = await prisma.productCostCalculation.findFirst({
      where: { id: raw.calculationId, userId: user.id },
    })
    if (!calc) return fail('Calculation not found')

    const payload = calc.payload as CostPricingPayload
    const totals = computeCostPricing(payload)
    const selected = payload.lines.filter(
      (l) => raw.lineIds.includes(l.id) && l.includeInUnitCost,
    )
    if (selected.length === 0) return fail('Select at least one cost component')

    if (calc.expenseIds.length > 0) {
      return fail(
        'Production payments were already recorded for this calculation. Duplicate creation is blocked.',
      )
    }

    const category = await prisma.expenseCategoryItem.findFirst({
      where: { id: raw.categoryId, userId: user.id, isArchived: false },
    })
    if (!category) return fail('Expense category not found')

    const paymentMode = raw.paymentMode === 'UNPAID' ? 'UNPAID' : 'PAID'
    const cashAccountId = raw.cashAccountId || null
    if (paymentMode === 'PAID') {
      if (!cashAccountId) {
        return fail('Select Cash or Bank for a paid production payment, or choose unpaid')
      }
      const account = await prisma.cashAccount.findFirst({
        where: { id: cashAccountId, userId: user.id, isActive: true },
      })
      if (!account) return fail('Payment account not found')
    }

    const { postProductionPaymentInTx } = await import('@/lib/services/cash-accounts')

    const createdIds: string[] = []
    await prisma.$transaction(async (tx) => {
      for (const line of selected) {
        const amount = totals.lineTotals.find((t) => t.id === line.id)?.total ?? 0
        if (amount <= 0) continue
        const created = await tx.expense.create({
          data: {
            userId: user.id,
            date: toDateOnly(raw.expenseDate),
            categoryId: category.id,
            ledgerKind: 'PRODUCTION_PAYMENT',
            costType: 'PRODUCTION',
            description: `${line.name || line.category} · ${calc.name}`.slice(0, 200),
            amount: prismaDecimal(amount),
            paymentMethod: raw.paymentMethod || 'CASH',
            cashAccountId: paymentMode === 'PAID' ? cashAccountId : null,
            vendor: null,
            reference: `COSTCALC:${calc.id}:${line.id}`,
            notes:
              `Production payment for ${calc.name} (qty ${calc.quantity}). ` +
              `Not an operating expense — cost is in inventory / COGS when sold.` +
              (paymentMode === 'UNPAID' ? ' Unpaid / payable.' : ''),
            productId: calc.productId,
            productionQuantity: calc.quantity,
            productionUnit: calc.unit,
            productionUnitCost: prismaDecimal(totals.costPerUnit),
            productionBatch: calc.name,
            updateInventory: false,
            costCalculationId: calc.id,
          },
        })
        createdIds.push(created.id)

        if (paymentMode === 'PAID' && cashAccountId) {
          await postProductionPaymentInTx(tx, {
            userId: user.id,
            accountId: cashAccountId,
            amount,
            date: toDateOnly(raw.expenseDate),
            expenseId: created.id,
            reference: `COSTCALC:${calc.id}:${line.id}`,
            notes: `Production payment · ${calc.name} · ${line.name || line.category}`,
          })
        }
      }

      await tx.productCostCalculation.update({
        where: { id: calc.id },
        data: { expenseIds: createdIds },
      })
    })

    if (createdIds.length === 0) return fail('No positive amounts to record as payments')

    revalidateCostPaths(calc.productId)
    revalidatePath('/cash-bank')
    revalidatePath('/expenses')
    return ok(
      {
        expenseIds: createdIds,
        totalAmount: selected.reduce((s, l) => {
          const amt = totals.lineTotals.find((t) => t.id === l.id)?.total ?? 0
          return s + amt
        }, 0),
      },
      paymentMode === 'PAID'
        ? `Recorded ${createdIds.length} production payment(s). Not an operating expense.`
        : `Recorded ${createdIds.length} unpaid production payable(s). Not an operating expense.`,
    )
  } catch (error) {
    console.error('createProductionExpensesFromCalculationAction', error)
    return fail(
      error instanceof Error ? error.message : 'Unable to record production payment',
    )
  }
}
