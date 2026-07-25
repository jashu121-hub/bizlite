'use server'

import { revalidatePath } from 'next/cache'
import { requireProfile } from '@/lib/auth'
import { fail, ok } from '@/lib/action-result'
import { prisma } from '@/lib/prisma'
import { prismaDecimal } from '@/lib/money'
import { toDateOnly } from '@/lib/dates'
import { productSchema, stockAdjustmentSchema } from '@/lib/validations/product'

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
        },
      })
      if (opening > 0) {
        await tx.stockMovement.create({
          data: {
            userId: user.id,
            productId: created.id,
            type: 'OPENING',
            quantity: opening,
            date: toDateOnly(new Date()),
            notes: 'Opening stock',
          },
        })
      }
      return created
    })
    revalidatePath('/products')
    revalidatePath('/dashboard')
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
    await prisma.product.update({
      where: { id },
      data: {
        name: data.name.trim(),
        category: data.category,
        sku: data.sku || null,
        costPrice: prismaDecimal(data.costPrice),
        sellingPrice: prismaDecimal(data.sellingPrice),
        openingStock: data.openingStock,
        currentStock: data.currentStock ?? existing.currentStock,
        lowStockLevel: data.lowStockLevel,
        notes: data.notes || null,
        isActive: data.isActive,
      },
    })
    revalidatePath('/products')
    revalidatePath(`/products/${id}`)
    revalidatePath('/dashboard')
    return ok({ id }, 'Product updated')
  } catch (error) {
    console.error('updateProductAction', error)
    return fail('Unable to update product')
  }
}

export async function deleteProductAction(id: string) {
  try {
    const { user } = await requireProfile()
    const existing = await prisma.product.findFirst({ where: { id, userId: user.id } })
    if (!existing) return fail('Product not found')
    await prisma.product.delete({ where: { id } })
    revalidatePath('/products')
    revalidatePath('/dashboard')
    return ok({ id }, 'Product deleted')
  } catch (error) {
    console.error('deleteProductAction', error)
    return fail('Unable to delete product. It may be linked to sales.')
  }
}

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
      const next =
        data.type === 'ADD'
          ? product.currentStock + data.quantity
          : product.currentStock - data.quantity
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
          date: toDateOnly(data.date),
          notes: data.notes || 'Stock adjustment',
        },
      })
    })
    revalidatePath('/products')
    revalidatePath(`/products/${data.productId}`)
    revalidatePath('/dashboard')
    return ok(undefined, 'Stock updated')
  } catch (error) {
    console.error('adjustStockAction', error)
    return fail(error instanceof Error ? error.message : 'Unable to adjust stock')
  }
}
