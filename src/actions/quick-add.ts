'use server'

import { requireProfile } from '@/lib/auth'
import { fail, ok } from '@/lib/action-result'
import { prisma } from '@/lib/prisma'

export async function getQuickAddOptionsAction() {
  try {
    const { user, profile } = await requireProfile()
    const [products, customers] = await Promise.all([
      prisma.product.findMany({
        where: { userId: user.id, isActive: true },
        select: { id: true, name: true, currentStock: true, sellingPrice: true },
        orderBy: { name: 'asc' },
      }),
      prisma.customer.findMany({
        where: { userId: user.id },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
    ])

    return ok({
      currency: profile.currency,
      products: products.map((product) => ({
        ...product,
        sellingPrice: product.sellingPrice.toString(),
      })),
      customers,
    })
  } catch (error) {
    console.error('getQuickAddOptionsAction', error)
    return fail(error instanceof Error ? error.message : 'Unable to load form data')
  }
}
