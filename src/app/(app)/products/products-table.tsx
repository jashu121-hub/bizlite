'use client'

import {
  ProductActions,
  ProductNameButton,
} from '@/app/(app)/products/product-actions'
import { StockStatusBadge } from '@/app/(app)/products/stock-status-badge'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { ResponsiveDataTable } from '@/components/shared/responsive-data-table'
import type { ProductCostBreakdown } from '@/lib/product-cost'
import { cn } from '@/lib/utils'

export type ProductRow = {
  id: string
  name: string
  category: string
  sku: string | null
  productType: 'RESALE' | 'MANUFACTURED' | 'SERVICE'
  unitOfMeasure: string
  currentStock: number
  lowStockLevel: number
  openingStock: number
  costPrice: string
  defaultPurchaseCost: string
  standardProductionCost: string
  sellingPrice: string
  notes: string | null
  costBreakdown: ProductCostBreakdown | null
  isActive: boolean
  updatedAt: string
  inventoryCostReadOnly?: boolean
}

const PRODUCT_TYPE_LABEL: Record<ProductRow['productType'], string> = {
  RESALE: 'Resale',
  MANUFACTURED: 'Manufactured',
  SERVICE: 'Service',
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
            <div className="min-w-0">
              <ProductNameButton product={p} currency={currency} />
              {p.sku ? <p className="text-xs text-zinc-400">SKU: {p.sku}</p> : null}
            </div>
          ),
        },
        { key: 'category', header: 'Category', cell: (p) => p.category },
        {
          key: 'type',
          header: 'Type',
          cell: (p) => PRODUCT_TYPE_LABEL[p.productType] ?? p.productType,
        },
        {
          key: 'stock',
          header: 'Stock',
          cell: (p) =>
            p.productType === 'SERVICE' ? (
              <span className="text-zinc-400">—</span>
            ) : (
              <StockStatusBadge currentStock={p.currentStock} lowStockLevel={p.lowStockLevel} />
            ),
        },
        {
          key: 'invCost',
          header: 'Inv. cost',
          cell: (p) =>
            p.productType === 'SERVICE' ? (
              <CurrencyDisplay value={p.costPrice} currency={currency} />
            ) : (
              <CurrencyDisplay value={p.costPrice} currency={currency} />
            ),
        },
        {
          key: 'price',
          header: 'Sell price',
          cell: (p) => <CurrencyDisplay value={p.sellingPrice} currency={currency} />,
        },
        {
          key: 'status',
          header: 'Status',
          cell: (p) => (
            <span className={cn(p.isActive ? 'text-emerald-600' : 'text-zinc-500')}>
              {p.isActive ? 'Active' : 'Archived'}
            </span>
          ),
        },
        {
          key: 'actions',
          header: 'Actions',
          className: 'text-right',
          cell: (p) => <ProductActions product={p} currency={currency} />,
        },
      ]}
      renderMobileCard={(p) => (
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <ProductNameButton product={p} currency={currency} />
              <p className="text-sm text-zinc-500">{p.category}</p>
              <p className={cn('mt-1 text-xs font-medium', p.isActive ? 'text-emerald-600' : 'text-amber-700')}>
                {p.isActive ? 'Active' : 'Archived — not available in New Sale'}
              </p>
            </div>
            <ProductActions product={p} currency={currency} compact />
          </div>
          <div className="flex items-center justify-between gap-3">
            <StockStatusBadge currentStock={p.currentStock} lowStockLevel={p.lowStockLevel} />
            <CurrencyDisplay value={p.sellingPrice} currency={currency} />
          </div>
        </div>
      )}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
    />
  )
}
