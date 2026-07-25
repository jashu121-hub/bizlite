import { notFound } from 'next/navigation'
import { format } from 'date-fns'

import { updateSaleAction } from '@/actions/sales'
import { PageHeader } from '@/components/shared/page-header'
import { requireProfile } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SalesForm } from '../../sales-form'

export default async function EditSalePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { user, profile } = await requireProfile()
  const [sale, products, customers] = await Promise.all([
    prisma.sale.findFirst({ where: { id, userId: user.id }, include: { items: true } }),
    prisma.product.findMany({
      where: { userId: user.id, isActive: true },
      select: {
        id: true,
        name: true,
        sku: true,
        currentStock: true,
        sellingPrice: true,
      },
      orderBy: { name: 'asc' },
    }),
    prisma.customer.findMany({
      where: { userId: user.id },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])
  if (!sale) notFound()

  // Include inactive products that are already on this sale so lines remain editable
  const missingIds = sale.items
    .map((item) => item.productId)
    .filter((productId): productId is string => Boolean(productId))
    .filter((productId) => !products.some((product) => product.id === productId))

  const extraProducts =
    missingIds.length > 0
      ? await prisma.product.findMany({
          where: { userId: user.id, id: { in: missingIds } },
          select: {
            id: true,
            name: true,
            sku: true,
            currentStock: true,
            sellingPrice: true,
          },
        })
      : []

  // Add back quantities already on this sale so stock validation allows the current lines
  const reservedByProduct = new Map<string, number>()
  for (const item of sale.items) {
    if (!item.productId) continue
    reservedByProduct.set(
      item.productId,
      (reservedByProduct.get(item.productId) ?? 0) + item.quantity,
    )
  }

  const productOptions = [...products, ...extraProducts].map((product) => ({
    ...product,
    currentStock: product.currentStock + (reservedByProduct.get(product.id) ?? 0),
    sellingPrice: product.sellingPrice.toString(),
  }))

  return (
    <div className="space-y-6">
      <PageHeader title={`Edit ${sale.invoiceNumber}`} description="Changes will reconcile stock." />
      <SalesForm
        products={productOptions}
        customers={customers}
        currency={profile.currency}
        initial={{
          date: format(sale.date, 'yyyy-MM-dd'),
          customerId: sale.customerId ?? '',
          items: sale.items.map((item) => ({
            productId: item.productId ?? '',
            quantity: item.quantity,
            unitSellingPrice: item.unitSellingPrice.toString(),
          })),
          discount: sale.discount.toString(),
          amountPaid: sale.amountPaid.toString(),
          paymentMethod: sale.paymentMethod,
          notes: sale.notes ?? '',
        }}
        onSubmit={updateSaleAction.bind(null, id)}
      />
    </div>
  )
}
