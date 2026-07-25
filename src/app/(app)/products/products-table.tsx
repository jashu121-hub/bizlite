'use client'

import Link from 'next/link'

import { CurrencyDisplay } from '@/components/shared/currency-display'
import { ResponsiveDataTable } from '@/components/shared/responsive-data-table'
import { stockStatus } from '@/lib/labels'

export type ProductRow = {
  id: string
  name: string
  category: string
  currentStock: number
  lowStockLevel: number
  sellingPrice: string
  isActive: boolean
}

export function ProductsTable({
  products,
  currency,
  emptyTitle,
  emptyDescription,
}: {
  products: ProductRow[]
  currency: string
  emptyTitle: string
  emptyDescription: string
}) {
  return (
    <ResponsiveDataTable
      data={products}
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
          cell: (p) => <CurrencyDisplay value={p.sellingPrice} currency={currency} />,
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
            <CurrencyDisplay value={p.sellingPrice} currency={currency} />
          </div>
        </div>
      )}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
    />
  )
}
