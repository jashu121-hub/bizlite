'use client'

import { stockStatus } from '@/lib/labels'
import { cn } from '@/lib/utils'

export function StockStatusBadge({
  currentStock,
  lowStockLevel,
}: {
  currentStock: number
  lowStockLevel: number
}) {
  const status = stockStatus(currentStock, lowStockLevel)
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
        status === 'In Stock' && 'bg-emerald-50 text-emerald-700',
        status === 'Low Stock' && 'bg-amber-50 text-amber-700',
        status === 'Out of Stock' && 'bg-red-50 text-red-700',
      )}
    >
      {currentStock} {status}
    </span>
  )
}
