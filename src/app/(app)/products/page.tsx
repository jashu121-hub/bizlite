import Link from 'next/link'
import { Plus } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requireProfile } from '@/lib/auth'
import { PageHeader } from '@/components/shared/page-header'
import { ResponsiveDataTable } from '@/components/shared/responsive-data-table'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { Button } from '@/components/ui/button'
import { stockStatus } from '@/lib/labels'

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
    orderBy: { name: 'asc' },
  })

  const filtered =
    stock === 'low'
      ? products.filter((p) => p.currentStock <= p.lowStockLevel)
      : products

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description={
          stock === 'low'
            ? 'Showing products at or below their low-stock alert level.'
            : 'Manage inventory and pricing.'
        }
        actions={
          <Button asChild>
            <Link href="/products/new">
              <Plus /> New product
            </Link>
          </Button>
        }
      />
      <ResponsiveDataTable
        data={filtered}
        getRowKey={(p) => p.id}
        columns={[
          {
            key: 'name',
            header: 'Product',
            cell: (p) => (
              <Link className="font-medium hover:underline" href={`/products/${p.id}`}>
                {p.name}
              </Link>
            ),
          },
          { key: 'category', header: 'Category', cell: (p) => p.category },
          {
            key: 'stock',
            header: 'Stock',
            cell: (p) => `${p.currentStock} (${stockStatus(p.currentStock, p.lowStockLevel)})`,
          },
          {
            key: 'price',
            header: 'Price',
            cell: (p) => <CurrencyDisplay value={p.sellingPrice} currency={profile.currency} />,
          },
          {
            key: 'status',
            header: 'Status',
            cell: (p) => (
              <span className={p.isActive ? 'text-emerald-600' : 'text-zinc-500'}>
                {p.isActive ? 'Active' : 'Inactive'}
              </span>
            ),
          },
        ]}
        renderMobileCard={(p) => (
          <div className="space-y-2">
            <Link className="font-medium" href={`/products/${p.id}`}>
              {p.name}
            </Link>
            <div className="flex justify-between text-sm">
              <span>{p.currentStock} in stock</span>
              <CurrencyDisplay value={p.sellingPrice} currency={profile.currency} />
            </div>
          </div>
        )}
        emptyTitle={stock === 'low' ? 'No low-stock products' : 'No products yet'}
        emptyDescription={
          stock === 'low'
            ? 'All products are above their alert levels.'
            : 'Add products before recording sales.'
        }
      />
    </div>
  )
}
