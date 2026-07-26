'use server'

import { revalidatePath } from 'next/cache'
import { requireProfile } from '@/lib/auth'
import { fail, ok } from '@/lib/action-result'
import { prisma } from '@/lib/prisma'
import { money, moneyNumber, prismaDecimal } from '@/lib/money'
import { toDateOnly } from '@/lib/dates'
import {
  normalizeCostBreakdown,
  type ProductCostBreakdown,
} from '@/lib/product-cost'
import { applyStockIssue, applyStockReceipt, tracksInventory } from '@/lib/services/inventory'
import {
  addStockSchema,
  adjustStockDetailedSchema,
  productSchema,
  stockAdjustmentSchema,
} from '@/lib/validations/product'
import { Prisma } from '@prisma/client'

function toCostBreakdownJson(
  raw: unknown,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  if (raw === undefined) return undefined
  if (raw === null) return Prisma.JsonNull
  const normalized = normalizeCostBreakdown(raw as Partial<ProductCostBreakdown>)
  return normalized as unknown as Prisma.InputJsonValue
}

function revalidateProductPaths(productId?: string) {
  revalidatePath('/products')
  revalidatePath('/dashboard')
  revalidatePath('/reports')
  revalidatePath('/sales')
  revalidatePath('/sales/new')
  revalidatePath('/cost-pricing')
  if (productId) revalidatePath(`/products/${productId}`)
}

function moneyOrZero(value: string | number | undefined | null): string {
  if (value === '' || value === null || value === undefined) return '0'
  return String(value)
}

export async function createProductAction(raw: unknown) {
  try {
    const { user } = await requireProfile()
    const parsed = productSchema.safeParse(raw)
    if (!parsed.success) return fail(parsed.error.issues[0]?.message || 'Invalid product')
    const data = parsed.data
    const isService = data.productType === 'SERVICE'
    const opening = isService ? 0 : Number(data.openingStock || 0)
    const openingUnitCost = moneyNumber(data.openingStockUnitCost || 0)
    const defaultPurchase = moneyOrZero(data.defaultPurchaseCost ?? data.costPrice)
    const directServiceCost = moneyOrZero(data.costPrice)
    const standardProduction = moneyOrZero(data.standardProductionCost)
    const selling = moneyOrZero(data.sellingPrice)

    if (opening > 0 && !(openingUnitCost > 0)) {
      return fail('Opening stock greater than zero requires a unit cost greater than zero')
    }

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          userId: user.id,
          name: data.name.trim(),
          category: data.category,
          sku: data.sku || null,
          productType: data.productType,
          unitOfMeasure: data.unitOfMeasure || 'pcs',
          // WAC starts at 0 for goods; opening receipt sets it. Services use direct cost.
          costPrice: prismaDecimal(isService ? directServiceCost : 0),
          defaultPurchaseCost: prismaDecimal(isService ? 0 : defaultPurchase),
          standardProductionCost: prismaDecimal(
            data.productType === 'MANUFACTURED' ? standardProduction : 0,
          ),
          sellingPrice: prismaDecimal(selling),
          openingStock: opening,
          currentStock: 0,
          lowStockLevel: isService ? 0 : data.lowStockLevel,
          notes: data.notes || null,
          isActive: data.isActive,
          costBreakdown: toCostBreakdownJson(data.costBreakdown ?? null),
        },
      })

      if (opening > 0) {
        await applyStockReceipt(tx, {
          userId: user.id,
          productId: created.id,
          quantity: opening,
          unitCost: openingUnitCost,
          type: 'OPENING',
          date: new Date(),
          reason: 'Opening Balance Correction',
          reference: `OPENING:${created.id}`,
          notes: 'Opening stock',
        })
      }

      return created
    })

    revalidateProductPaths(product.id)
    return ok({ id: product.id }, 'Product created')
  } catch (error) {
    console.error('createProductAction', error)
    return fail(error instanceof Error ? error.message : 'Unable to create product')
  }
}

export async function updateProductAction(id: string, raw: unknown) {
  try {
    const { user } = await requireProfile()
    const parsed = productSchema.safeParse(raw)
    if (!parsed.success) return fail(parsed.error.issues[0]?.message || 'Invalid product')
    const existing = await prisma.product.findFirst({ where: { id, userId: user.id } })
    if (!existing) return fail('Product not found')
    const data = parsed.data
    const nextName = data.name.trim()
    const isService = data.productType === 'SERVICE'
    const movementCount = await prisma.stockMovement.count({
      where: { productId: id, userId: user.id },
    })

    // Switching to SERVICE while stock remains is not allowed.
    if (isService && existing.currentStock !== 0) {
      return fail('Clear stock before changing this product to a Service')
    }

    const defaultPurchase = moneyOrZero(data.defaultPurchaseCost ?? data.costPrice)
    const selling = moneyOrZero(data.sellingPrice)
    const standardProduction = moneyOrZero(data.standardProductionCost)
    const directServiceCost = moneyOrZero(data.costPrice)

    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: {
          name: nextName,
          category: data.category,
          sku: data.sku || null,
          productType: data.productType,
          unitOfMeasure: data.unitOfMeasure || 'pcs',
          // Inventory WAC is ledger-driven once movements exist.
          ...(isService
            ? { costPrice: prismaDecimal(directServiceCost), currentStock: 0, lowStockLevel: 0 }
            : movementCount === 0 && existing.currentStock === 0
              ? {} // keep existing WAC (usually 0) — do not let form overwrite
              : {}),
          defaultPurchaseCost: prismaDecimal(isService ? 0 : defaultPurchase),
          standardProductionCost: prismaDecimal(
            data.productType === 'MANUFACTURED' ? standardProduction : 0,
          ),
          sellingPrice: prismaDecimal(selling),
          openingStock: existing.openingStock,
          currentStock: isService ? 0 : existing.currentStock,
          lowStockLevel: isService ? 0 : data.lowStockLevel,
          notes: data.notes || null,
          isActive: data.isActive,
          costBreakdown: toCostBreakdownJson(data.costBreakdown ?? null),
        },
      })
      if (nextName !== existing.name) {
        await tx.saleItem.updateMany({
          where: { productId: id },
          data: { productName: nextName },
        })
      }
    })
    revalidateProductPaths(id)
    return ok({ id }, 'Product updated')
  } catch (error) {
    console.error('updateProductAction', error)
    return fail('Unable to update product')
  }
}

export async function getProductDeleteStatusAction(id: string) {
  try {
    const { user } = await requireProfile()
    const product = await prisma.product.findFirst({
      where: { id, userId: user.id },
      include: {
        _count: {
          select: {
            saleItems: true,
            stockMovements: true,
            expenses: true,
            costCalculations: true,
          },
        },
      },
    })
    if (!product) return fail('Product not found')
    const links = {
      saleItems: product._count.saleItems,
      stockMovements: product._count.stockMovements,
      expenses: product._count.expenses,
      costCalculations: product._count.costCalculations,
    }
    const hasHistory =
      links.saleItems > 0 ||
      links.stockMovements > 0 ||
      links.expenses > 0 ||
      links.costCalculations > 0
    return ok({
      id: product.id,
      name: product.name,
      isActive: product.isActive,
      canDelete: !hasHistory,
      ...links,
      related: [
        links.saleItems > 0 ? `${links.saleItems} sale line(s)` : null,
        links.stockMovements > 0 ? `${links.stockMovements} stock movement(s)` : null,
        links.expenses > 0 ? `${links.expenses} expense(s)` : null,
        links.costCalculations > 0 ? `${links.costCalculations} cost calculation(s)` : null,
      ].filter(Boolean) as string[],
    })
  } catch (error) {
    console.error('getProductDeleteStatusAction', error)
    return fail('Unable to check product')
  }
}

export async function deleteProductAction(id: string) {
  try {
    const { user } = await requireProfile()
    const existing = await prisma.product.findFirst({
      where: { id, userId: user.id },
      include: {
        _count: {
          select: {
            saleItems: true,
            stockMovements: true,
            expenses: true,
            costCalculations: true,
          },
        },
      },
    })
    if (!existing) return fail('Product not found')
    const linked =
      existing._count.saleItems > 0 ||
      existing._count.stockMovements > 0 ||
      existing._count.expenses > 0 ||
      existing._count.costCalculations > 0
    if (linked) {
      return fail(
        'This product has linked sales, stock movements, expenses or cost calculations and cannot be permanently deleted. Reset those transactions first, or archive the product.',
      )
    }
    await prisma.product.delete({ where: { id } })
    revalidateProductPaths()
    return ok({ id }, 'Product deleted')
  } catch (error) {
    console.error('deleteProductAction', error)
    return fail('Unable to delete product. It may be linked to sales.')
  }
}

export async function archiveProductAction(id: string) {
  try {
    const { user } = await requireProfile()
    const existing = await prisma.product.findFirst({ where: { id, userId: user.id } })
    if (!existing) return fail('Product not found')
    await prisma.product.update({
      where: { id },
      data: { isActive: false },
    })
    revalidateProductPaths(id)
    return ok({ id }, 'Product archived')
  } catch (error) {
    console.error('archiveProductAction', error)
    return fail('Unable to archive product')
  }
}

export async function restoreProductAction(id: string) {
  try {
    const { user } = await requireProfile()
    const existing = await prisma.product.findFirst({ where: { id, userId: user.id } })
    if (!existing) return fail('Product not found')
    await prisma.product.update({
      where: { id },
      data: { isActive: true },
    })
    revalidateProductPaths(id)
    return ok({ id }, 'Product restored')
  } catch (error) {
    console.error('restoreProductAction', error)
    return fail('Unable to restore product')
  }
}

export async function addStockAction(raw: unknown) {
  try {
    const { user } = await requireProfile()
    const parsed = addStockSchema.safeParse(raw)
    if (!parsed.success) return fail(parsed.error.issues[0]?.message || 'Invalid stock addition')
    const data = parsed.data

    await prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({
        where: { id: data.productId, userId: user.id },
      })
      if (!product) throw new Error('Product not found')
      if (!tracksInventory(product.productType)) {
        throw new Error('Services cannot hold stock')
      }

      const noteParts = [
        data.supplier ? `Supplier: ${data.supplier}` : null,
        data.notes || null,
      ].filter(Boolean)

      const batchBreakdown = data.costBreakdown
        ? normalizeCostBreakdown(data.costBreakdown)
        : null
      const hasBatchProduction =
        Boolean(batchBreakdown) && money(batchBreakdown!.totalProductionCost).gt(0)
      const hasBatchBreakdown =
        Boolean(batchBreakdown) &&
        (hasBatchProduction || money(batchBreakdown!.totalSellingCost).gt(0))

      const unitCost = hasBatchProduction
        ? batchBreakdown!.inventoryCostPerUnit
        : data.purchaseCost !== '' && data.purchaseCost != null
          ? String(data.purchaseCost)
          : moneyNumber(product.defaultPurchaseCost) > 0
            ? product.defaultPurchaseCost.toString()
            : product.costPrice.toString()

      await applyStockReceipt(tx, {
        userId: user.id,
        productId: product.id,
        quantity: data.quantity,
        unitCost,
        type: 'ADJUSTMENT_IN',
        date: data.date,
        reason: 'New Purchase',
        reference: data.reference || null,
        notes: noteParts.join(' · ') || 'Stock added',
      })

      if (hasBatchBreakdown) {
        await tx.product.update({
          where: { id: product.id },
          data: { costBreakdown: toCostBreakdownJson(batchBreakdown) },
        })
      }
    })

    revalidateProductPaths(data.productId)
    return ok(undefined, 'Stock added')
  } catch (error) {
    console.error('addStockAction', error)
    return fail(error instanceof Error ? error.message : 'Unable to add stock')
  }
}

export async function adjustStockDetailedAction(raw: unknown) {
  try {
    const { user, profile } = await requireProfile()
    const parsed = adjustStockDetailedSchema.safeParse(raw)
    if (!parsed.success) return fail(parsed.error.issues[0]?.message || 'Invalid adjustment')
    const data = parsed.data
    const allowNegative = Boolean(profile.allowNegativeStock)

    await prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({
        where: { id: data.productId, userId: user.id },
      })
      if (!product) throw new Error('Product not found')
      if (!tracksInventory(product.productType)) {
        throw new Error('Services cannot hold stock')
      }

      const before = product.currentStock
      let after = before
      let delta = 0

      if (data.mode === 'INCREASE') {
        delta = data.quantity
        after = before + data.quantity
      } else if (data.mode === 'DECREASE') {
        delta = -data.quantity
        after = before - data.quantity
      } else {
        after = data.quantity
        delta = after - before
      }

      if (after < 0 && !allowNegative) throw new Error('Stock cannot become negative')
      if (delta === 0) throw new Error('No stock change to apply')

      const unitCost =
        moneyNumber(product.costPrice) > 0
          ? product.costPrice
          : product.defaultPurchaseCost

      if (delta > 0) {
        await applyStockReceipt(tx, {
          userId: user.id,
          productId: product.id,
          quantity: delta,
          unitCost,
          type: 'ADJUSTMENT_IN',
          date: data.date,
          reason: data.reason,
          notes: data.notes || 'Stock adjustment',
        })
      } else {
        await applyStockIssue(tx, {
          userId: user.id,
          productId: product.id,
          quantity: Math.abs(delta),
          unitCost,
          type: 'ADJUSTMENT_OUT',
          date: data.date,
          reason: data.reason,
          notes: data.notes || 'Stock adjustment',
          allowNegative,
        })
      }
    })

    revalidateProductPaths(data.productId)
    return ok(undefined, 'Stock adjusted')
  } catch (error) {
    console.error('adjustStockDetailedAction', error)
    return fail(error instanceof Error ? error.message : 'Unable to adjust stock')
  }
}

/** Legacy adjust used by product detail page */
export async function adjustStockAction(raw: unknown) {
  try {
    const { user, profile } = await requireProfile()
    const parsed = stockAdjustmentSchema.safeParse(raw)
    if (!parsed.success) return fail(parsed.error.issues[0]?.message || 'Invalid adjustment')
    const data = parsed.data
    const allowNegative = Boolean(profile.allowNegativeStock)

    await prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({
        where: { id: data.productId, userId: user.id },
      })
      if (!product) throw new Error('Product not found')
      if (!tracksInventory(product.productType)) {
        throw new Error('Services cannot hold stock')
      }

      const unitCost =
        moneyNumber(product.costPrice) > 0
          ? product.costPrice
          : product.defaultPurchaseCost

      if (data.type === 'ADD') {
        await applyStockReceipt(tx, {
          userId: user.id,
          productId: product.id,
          quantity: data.quantity,
          unitCost,
          type: 'ADJUSTMENT_IN',
          date: data.date,
          reason: 'Manual Correction',
          notes: data.notes || 'Stock adjustment',
        })
      } else {
        await applyStockIssue(tx, {
          userId: user.id,
          productId: product.id,
          quantity: data.quantity,
          unitCost,
          type: 'ADJUSTMENT_OUT',
          date: data.date,
          reason: 'Manual Correction',
          notes: data.notes || 'Stock adjustment',
          allowNegative,
        })
      }
    })
    revalidateProductPaths(data.productId)
    return ok(undefined, 'Stock updated')
  } catch (error) {
    console.error('adjustStockAction', error)
    return fail(error instanceof Error ? error.message : 'Unable to adjust stock')
  }
}

export async function getStockHistoryAction(productId: string) {
  try {
    const { user, profile } = await requireProfile()
    const product = await prisma.product.findFirst({
      where: { id: productId, userId: user.id },
      select: { id: true, name: true, sku: true },
    })
    if (!product) return fail('Product not found')

    const movements = await prisma.stockMovement.findMany({
      where: { productId, userId: user.id },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: 50,
    })

    return ok({
      product,
      userLabel: profile.ownerName || profile.email,
      movements: movements.map((m) => ({
        id: m.id,
        type: m.type,
        quantity: m.quantity,
        quantityBefore: m.quantityBefore,
        quantityAfter: m.quantityAfter,
        unitCost: m.unitCost?.toString() ?? null,
        totalCost: m.totalCost?.toString() ?? null,
        averageCostAfter: m.averageCostAfter?.toString() ?? null,
        reason: m.reason,
        reference: m.reference,
        date: m.date.toISOString(),
        createdAt: m.createdAt.toISOString(),
        notes: m.notes,
      })),
    })
  } catch (error) {
    console.error('getStockHistoryAction', error)
    return fail('Unable to load stock history')
  }
}
