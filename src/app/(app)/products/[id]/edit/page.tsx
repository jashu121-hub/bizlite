import { notFound } from 'next/navigation'

import { updateProductAction } from '@/actions/products'
import { ProductForm } from '../../product-form'
import { PageHeader } from '@/components/shared/page-header'
import { requireProfile } from '@/lib/auth'
import { parseCostBreakdown } from '@/lib/product-cost'
import { prisma } from '@/lib/prisma'

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { user, profile } = await requireProfile()
  const p = await prisma.product.findFirst({ where: { id, userId: user.id } })
  if (!p) notFound()

  return (
    <div className="space-y-6">
      <PageHeader title="Edit product" description="Update inventory information." />
      <ProductForm
        currency={profile.currency}
        initial={{
          name: p.name,
          category: p.category,
          sku: p.sku ?? '',
          costPrice: p.costPrice.toString(),
          sellingPrice: p.sellingPrice.toString(),
          openingStock: p.openingStock,
          currentStock: p.currentStock,
          lowStockLevel: p.lowStockLevel,
          notes: p.notes ?? '',
          isActive: p.isActive,
          costBreakdown: parseCostBreakdown(p.costBreakdown),
        }}
        onSubmit={updateProductAction.bind(null, id)}
      />
    </div>
  )
}
