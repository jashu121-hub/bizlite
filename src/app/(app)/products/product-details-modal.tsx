'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { getStockHistoryAction } from '@/actions/products'
import { ProductModalShell } from '@/app/(app)/products/product-modal-shell'
import type { ProductRow } from '@/app/(app)/products/products-table'
import { StockStatusBadge } from '@/app/(app)/products/stock-status-badge'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/dates'
import { cn } from '@/lib/utils'

export function ProductDetailsModal({
  product,
  currency,
  open,
  onOpenChange,
}: {
  product: ProductRow | null
  currency: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [loading, setLoading] = useState(false)
  const [recent, setRecent] = useState<
    Array<{ id: string; quantity: number; date: string; reason: string | null }>
  >([])

  useEffect(() => {
    if (!product || !open) return
    let cancelled = false
    setLoading(true)
    void getStockHistoryAction(product.id).then((result) => {
      if (cancelled) return
      setLoading(false)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      setRecent(
        result.data.movements.slice(0, 5).map((m) => ({
          id: m.id,
          quantity: m.quantity,
          date: m.date,
          reason: m.reason,
        })),
      )
    })
    return () => {
      cancelled = true
    }
  }, [product, open])

  if (!product) return null

  const stockValue = Number(product.costPrice) * product.currentStock

  return (
    <ProductModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={product.name}
      description="Product details"
    >
      <div className="space-y-4 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <StockStatusBadge
            currentStock={product.currentStock}
            lowStockLevel={product.lowStockLevel}
          />
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-xs font-medium',
              product.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-500',
            )}
          >
            {product.isActive ? 'Active' : 'Archived'}
          </span>
        </div>

        <dl className="grid gap-2 sm:grid-cols-2">
          <Item label="SKU" value={product.sku || '—'} />
          <Item label="Category" value={product.category} />
          <Item label="Current stock" value={String(product.currentStock)} />
          <Item label="Low-stock alert" value={String(product.lowStockLevel)} />
          <Item
            label="Cost price"
            value={<CurrencyDisplay value={product.costPrice} currency={currency} />}
          />
          <Item
            label="Selling price"
            value={<CurrencyDisplay value={product.sellingPrice} currency={currency} />}
          />
          <Item
            label="Stock value"
            value={<CurrencyDisplay value={stockValue} currency={currency} />}
          />
          <Item
            label="Last stock update"
            value={product.updatedAt ? formatDate(product.updatedAt) : '—'}
          />
        </dl>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Recent stock movements
          </p>
          {loading ? (
            <Skeleton className="h-20 w-full" />
          ) : recent.length === 0 ? (
            <p className="text-zinc-400">No recent movements.</p>
          ) : (
            <ul className="space-y-2">
              {recent.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2"
                >
                  <span className="text-zinc-600">
                    {formatDate(item.date)}
                    {item.reason ? ` · ${item.reason}` : ''}
                  </span>
                  <span
                    className={cn(
                      'font-bold tabular-nums',
                      item.quantity >= 0 ? 'text-emerald-600' : 'text-red-600',
                    )}
                  >
                    {item.quantity >= 0 ? '+' : ''}
                    {item.quantity}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </ProductModalShell>
  )
}

function Item({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-zinc-50 px-3 py-2">
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="mt-0.5 font-medium text-zinc-900">{value}</dd>
    </div>
  )
}
