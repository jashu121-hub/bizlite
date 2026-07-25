'use server'

import { revalidatePath } from 'next/cache'
import { requireProfile } from '@/lib/auth'
import { fail, ok } from '@/lib/action-result'
import { prisma } from '@/lib/prisma'
import { money, prismaDecimal } from '@/lib/money'
import { toDateOnly } from '@/lib/dates'
import {
  normalizeCostBreakdown,
  weightedAverageCost,
  type ProductCostBreakdown,
} from '@/lib/product-cost'
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
  if (productId) revalidatePath(`/products/${productId}`)
}

export async function createProductAction(raw: unknown) {
  try {
    const { user } = await requireProfile()
    const parsed = productSchema.safeParse(raw)
    if (!parsed.success) return fail(parsed.error.issues[0]?.message || 'Invalid product')
    const data = parsed.data
    const opening = data.openingStock
    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          userId: user.id,
          name: data.name.trim(),
          category: data.category,
          sku: data.sku || null,
          costPrice: prismaDecimal(data.costPrice),
          sellingPrice: prismaDecimal(data.sellingPrice),
          openingStock: opening,
          currentStock: opening,
          lowStockLevel: data.lowStockLevel,
          notes: data.notes || null,
          isActive: data.isActive,
          costBreakdown: toCostBreakdownJson(data.costBreakdown ?? null),
        },
      })
      if (opening > 0) {
        await tx.stockMovement.create({
          data: {
            userId: user.id,
            productId: created.id,
            type: 'OPENING',
            quantity: opening,
            quantityBefore: 0,
            quantityAfter: opening,
            reason: 'Opening Balance Correction',
            date: toDateOnly(new Date()),
            notes: 'Opening stock',
          },
        })
      }
      return created
    })
    revalidateProductPaths(product.id)
    return ok({ id: product.id }, 'Product created')
  } catch (error) {
    console.error('createProductAction', error)
    return fail('Unable to create product')
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
    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: {
          name: nextName,
          category: data.category,
          sku: data.sku || null,
          costPrice: prismaDecimal(data.costPrice),
          sellingPrice: prismaDecimal(data.sellingPrice),
          // Keep stock immutable via product edit
          openingStock: existing.openingStock,
          currentStock: existing.currentStock,
          lowStockLevel: data.lowStockLevel,
          notes: data.notes || null,
          isActive: data.isActive,
          costBreakdown: toCostBreakdownJson(data.costBreakdown ?? null),
        },
      })
      // Keep denormalized sale line names in sync (reports, invoices, dashboard)
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
        _count: { select: { saleItems: true, stockMovements: true } },
      },
    })
    if (!product) return fail('Product not found')
    const hasHistory = product._count.saleItems > 0 || product._count.stockMovements > 0
    return ok({
      id: product.id,
      name: product.name,
      isActive: product.isActive,
      canDelete: !hasHistory,
      saleItems: product._count.saleItems,
      stockMovements: product._count.stockMovements,
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
      include: { _count: { select: { saleItems: true, stockMovements: true } } },
    })
    if (!existing) return fail('Product not found')
    if (existing._count.saleItems > 0 || existing._count.stockMovements > 0) {
      return fail(
        'This product has transaction history and cannot be permanently deleted. You can archive it instead.',
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

      const before = product.currentStock
      const after = before + data.quantity
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
      const newUnitCost = hasBatchProduction
        ? batchBreakdown!.inventoryCostPerUnit
        : data.purchaseCost
          ? String(data.purchaseCost)
          : null

      const nextCostPrice = newUnitCost
        ? weightedAverageCost(before, product.costPrice, data.quantity, newUnitCost)
        : null

      await tx.product.update({
        where: { id: product.id },
        data: {
          currentStock: after,
          ...(nextCostPrice ? { costPrice: prismaDecimal(nextCostPrice) } : {}),
          ...(hasBatchBreakdown
            ? { costBreakdown: toCostBreakdownJson(batchBreakdown) }
            : {}),
        },
      })

      await tx.stockMovement.create({
        data: {
          userId: user.id,
          productId: product.id,
          type: 'ADJUSTMENT_IN',
          quantity: data.quantity,
          quantityBefore: before,
          quantityAfter: after,
          reason: 'New Purchase',
          reference: data.reference || null,
          date: toDateOnly(data.date),
          notes: noteParts.join(' · ') || 'Stock added',
        },
      })
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
    const { user } = await requireProfile()
    const parsed = adjustStockDetailedSchema.safeParse(raw)
    if (!parsed.success) return fail(parsed.error.issues[0]?.message || 'Invalid adjustment')
    const data = parsed.data

    await prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({
        where: { id: data.productId, userId: user.id },
      })
      if (!product) throw new Error('Product not found')

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

      if (after < 0) throw new Error('Stock cannot become negative')
      if (delta === 0) throw new Error('No stock change to apply')

      await tx.product.update({
        where: { id: product.id },
        data: { currentStock: after },
      })

      await tx.stockMovement.create({
        data: {
          userId: user.id,
          productId: product.id,
          type: delta > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
          quantity: delta,
          quantityBefore: before,
          quantityAfter: after,
          reason: data.reason,
          date: toDateOnly(data.date),
          notes: data.notes || 'Stock adjustment',
        },
      })
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
    const { user } = await requireProfile()
    const parsed = stockAdjustmentSchema.safeParse(raw)
    if (!parsed.success) return fail(parsed.error.issues[0]?.message || 'Invalid adjustment')
    const data = parsed.data
    await prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({
        where: { id: data.productId, userId: user.id },
      })
      if (!product) throw new Error('Product not found')
      const before = product.currentStock
      const next =
        data.type === 'ADD' ? before + data.quantity : before - data.quantity
      if (next < 0) throw new Error('Stock cannot become negative')
      await tx.product.update({
        where: { id: product.id },
        data: { currentStock: next },
      })
      await tx.stockMovement.create({
        data: {
          userId: user.id,
          productId: product.id,
          type: data.type === 'ADD' ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
          quantity: data.type === 'ADD' ? data.quantity : -data.quantity,
          quantityBefore: before,
          quantityAfter: next,
          reason: 'Manual Correction',
          date: toDateOnly(data.date),
          notes: data.notes || 'Stock adjustment',
        },
      })
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
