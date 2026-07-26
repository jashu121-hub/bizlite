import Link from 'next/link'
import { Plus } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requireProfile } from '@/lib/auth'
import { parseCostBreakdown } from '@/lib/product-cost'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { ProductsTable } from './products-table'

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const { user, profile } = await requireProfile()
  const stock = typeof params.stock === 'string' ? params.stock : undefined

  const products = await prisma.product.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      name: true,
      category: true,
      sku: true,
      productType: true,
      unitOfMeasure: true,
      currentStock: true,
      lowStockLevel: true,
      openingStock: true,
      costPrice: true,
      defaultPurchaseCost: true,
      standardProductionCost: true,
      sellingPrice: true,
      notes: true,
      costBreakdown: true,
      isActive: true,
      updatedAt: true,
      _count: { select: { stockMovements: true } },
    },
    orderBy: { name: 'asc' },
  })

  const filtered =
    stock === 'low'
      ? products.filter(
          (p) =>
            p.productType !== 'SERVICE' && p.currentStock <= p.lowStockLevel,
        )
      : products

  const rows = filtered.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    sku: p.sku,
    productType: p.productType,
    unitOfMeasure: p.unitOfMeasure,
    currentStock: p.currentStock,
    lowStockLevel: p.lowStockLevel,
    openingStock: p.openingStock,
    costPrice: p.costPrice.toString(),
    defaultPurchaseCost: p.defaultPurchaseCost.toString(),
    standardProductionCost: p.standardProductionCost.toString(),
    sellingPrice: p.sellingPrice.toString(),
    notes: p.notes,
    costBreakdown: parseCostBreakdown(p.costBreakdown),
    isActive: p.isActive,
    updatedAt: p.updatedAt.toISOString(),
    inventoryCostReadOnly: p._count.stockMovements > 0 || p.currentStock > 0,
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description={
          stock === 'low'
            ? 'Showing products at or below their low-stock alert level.'
            : 'Manage inventory, stock, and pricing.'
        }
        actions={
          <Button asChild>
            <Link href="/products/new">
              <Plus /> New product
            </Link>
          </Button>
        }
      />
      <ProductsTable
        products={rows}
        currency={profile.currency}
        emptyTitle={stock === 'low' ? 'No low-stock products' : 'No products yet'}
        emptyDescription={
          stock === 'low'
            ? 'All products are above their alert levels.'
            : 'Add your first product to start tracking inventory.'
        }
      />
    </div>
  )
}
