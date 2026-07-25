'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { getStockHistoryAction } from '@/actions/products'
import { ProductModalShell } from '@/app/(app)/products/product-modal-shell'
import type { ProductRow } from '@/app/(app)/products/products-table'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/dates'
import { cn } from '@/lib/utils'

type Movement = {
  id: string
  type: string
  quantity: number
  quantityBefore: number | null
  quantityAfter: number | null
  reason: string | null
  reference: string | null
  date: string
  createdAt: string
  notes: string | null
}

export function StockHistoryModal({
  product,
  open,
  onOpenChange,
}: {
  product: ProductRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [loading, setLoading] = useState(false)
  const [userLabel, setUserLabel] = useState('')
  const [movements, setMovements] = useState<Movement[]>([])

  useEffect(() => {
    if (!product || !open) return
    let cancelled = false
    setLoading(true)
    void getStockHistoryAction(product.id).then((result) => {
      if (cancelled) return
      setLoading(false)
      if (!result.success) {
        toast.error(result.error)
        onOpenChange(false)
        return
      }
      setUserLabel(result.data.userLabel)
      setMovements(result.data.movements)
    })
    return () => {
      cancelled = true
    }
  }, [product, open, onOpenChange])

  if (!product) return null

  return (
    <ProductModalShell
      open={open}
      onOpenChange={onOpenChange}
      title="Stock History"
      description={product.name}
      wide
    >
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : movements.length === 0 ? (
        <p className="py-10 text-center text-sm text-zinc-400">No stock movements yet.</p>
      ) : (
        <ul className="space-y-3">
          {movements.map((movement) => (
            <li
              key={movement.id}
              className="rounded-xl border border-zinc-200/80 px-3 py-3 text-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-zinc-900">
                    {formatDate(movement.date)} · {movement.type.replace(/_/g, ' ')}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Prev: {movement.quantityBefore ?? '—'} → New:{' '}
                    {movement.quantityAfter ?? '—'}
                    {movement.reason ? ` · ${movement.reason}` : ''}
                    {movement.reference ? ` · Ref ${movement.reference}` : ''}
                  </p>
                  {movement.notes ? (
                    <p className="mt-1 text-xs text-zinc-500">{movement.notes}</p>
                  ) : null}
                  <p className="mt-1 text-[11px] text-zinc-400">User: {userLabel}</p>
                </div>
                <span
                  className={cn(
                    'shrink-0 text-sm font-bold tabular-nums',
                    movement.quantity >= 0 ? 'text-emerald-600' : 'text-red-600',
                  )}
                >
                  {movement.quantity >= 0 ? '+' : ''}
                  {movement.quantity}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </ProductModalShell>
  )
}
