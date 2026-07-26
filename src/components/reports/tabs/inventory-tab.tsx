'use client'

import { useMemo, useState } from 'react'

import { CompactMetricCard } from '@/components/reports/compact-metric-card'
import { ReportDataTable } from '@/components/reports/report-data-table'
import { formatCurrency } from '@/lib/money'
import type { ReportsData } from '@/lib/types/reports'
import { cn } from '@/lib/utils'

type StockFilter = 'all' | 'in' | 'low' | 'out' | 'archived'

export function InventoryTab({ data, currency }: { data: ReportsData; currency: string }) {
  const [filter, setFilter] = useState<StockFilter>('all')
  const money = (value: number) => formatCurrency(value, currency)
  const inv = data.inventory

  const rows = useMemo(() => {
    return inv.rows.filter((row) => {
      if (filter === 'archived') return !row.isActive
      if (!row.isActive) return false
      if (filter === 'in') return row.stockStatus === 'In Stock'
      if (filter === 'low') return row.stockStatus === 'Low Stock'
      if (filter === 'out') return row.stockStatus === 'Out of Stock'
      return true
    })
  }, [inv.rows, filter])

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-zinc-900">Current Inventory Position</h3>
        <p className="text-xs text-zinc-500">
          Inventory balances are current and do not change with the historical report date range.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
        <CompactMetricCard label="Current Stock Value" value={money(inv.stockValue)} tone="info" />
        <CompactMetricCard
          label="Potential Sales Value"
          value={money(inv.potentialSalesValue)}
        />
        <CompactMetricCard
          label="Potential Gross Profit"
          value={money(inv.potentialGrossProfit)}
          tone={inv.potentialGrossProfit >= 0 ? 'success' : 'danger'}
        />
        <CompactMetricCard
          label="Low Stock Items"
          value={inv.lowStockCount}
          tone={inv.lowStockCount > 0 ? 'warning' : 'default'}
        />
        <CompactMetricCard
          label="Out-of-Stock Items"
          value={inv.outOfStockCount}
          tone={inv.outOfStockCount > 0 ? 'danger' : 'default'}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ['all', 'All Products'],
            ['in', 'In Stock'],
            ['low', 'Low Stock'],
            ['out', 'Out of Stock'],
            ['archived', 'Archived'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium',
              filter === value
                ? 'bg-teal-700 text-white'
                : 'bg-white text-zinc-600 ring-1 ring-zinc-200',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <ReportDataTable
          headers={[
            { key: 'product', label: 'Product' },
            { key: 'purchased', label: 'Purchased', align: 'right' },
            { key: 'sold', label: 'Sold', align: 'right' },
            { key: 'balance', label: 'Balance', align: 'right' },
            { key: 'avg', label: 'Average Unit Cost', align: 'right' },
            { key: 'sell', label: 'Selling Price', align: 'right' },
            { key: 'value', label: 'Closing Value', align: 'right' },
            { key: 'potential', label: 'Potential Sales Value', align: 'right' },
            { key: 'pgp', label: 'Potential Gross Profit', align: 'right' },
            { key: 'status', label: 'Status' },
          ]}
          rows={rows.map((row) => ({
            key: row.id,
            cells: [
              row.product,
              row.purchased,
              row.sold,
              row.balance,
              money(row.costPrice),
              money(row.sellingPrice),
              money(row.stockCostValue),
              money(row.potentialSellingValue),
              money(row.potentialGrossProfit),
              <span
                key="st"
                className={cn(
                  'rounded-full px-2 py-0.5 text-[11px] font-medium',
                  row.stockStatus === 'Out of Stock'
                    ? 'bg-red-50 text-red-700'
                    : row.stockStatus === 'Low Stock'
                      ? 'bg-amber-50 text-amber-800'
                      : 'bg-emerald-50 text-emerald-700',
                )}
              >
                {!row.isActive ? 'Archived' : row.stockStatus}
              </span>,
            ],
          }))}
          emptyMessage="No products match this filter."
        />
      </section>
    </div>
  )
}
