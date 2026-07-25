'use client'

import { useState } from 'react'

import { CompactMetricCard } from '@/components/reports/compact-metric-card'
import { ReportDataTable } from '@/components/reports/report-data-table'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/money'
import type { ReportsData } from '@/lib/types/reports'
import { cn } from '@/lib/utils'

function Row({
  label,
  value,
  strong,
  tone,
  separator,
}: {
  label: string
  value: string
  strong?: boolean
  tone?: 'success' | 'danger' | 'muted'
  separator?: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 py-1.5 text-sm',
        separator && 'mt-1 border-t border-zinc-200 pt-2',
      )}
    >
      <span className={cn(strong ? 'font-medium text-zinc-900' : 'text-zinc-600')}>{label}</span>
      <span
        className={cn(
          'tabular-nums',
          strong && 'font-semibold',
          tone === 'success' && 'text-emerald-600',
          tone === 'danger' && 'text-red-600',
          tone === 'muted' && 'text-zinc-600',
          !tone && 'text-zinc-900',
        )}
      >
        {value}
      </span>
    </div>
  )
}

export function ProfitabilityTab({
  data,
  currency,
  onViewAllProducts,
}: {
  data: ReportsData
  currency: string
  onViewAllProducts: () => void
}) {
  const [showAll, setShowAll] = useState(false)
  const money = (value: number) => formatCurrency(value, currency)
  const p = data.profit
  const products = showAll ? data.productPerformance : data.productPerformance.slice(0, 5)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
        <CompactMetricCard
          label="Gross Profit"
          value={money(p.grossProfit)}
          tone={p.grossProfit >= 0 ? 'success' : 'danger'}
        />
        <CompactMetricCard
          label="Gross Margin"
          value={p.grossMargin === null ? '—' : `${p.grossMargin.toFixed(2)}%`}
          tone={(p.grossMargin ?? 0) >= 0 ? 'success' : 'danger'}
        />
        <CompactMetricCard
          label="Profit After Selling Costs"
          value={money(p.profitAfterSelling)}
          tone={p.profitAfterSelling >= 0 ? 'success' : 'danger'}
        />
        <CompactMetricCard
          label="Net Profit"
          value={money(p.netProfit)}
          tone={p.netProfit >= 0 ? 'success' : 'danger'}
        />
        <CompactMetricCard
          label="Net Margin"
          value={p.netMargin === null ? '—' : `${p.netMargin.toFixed(2)}%`}
          tone={(p.netMargin ?? 0) >= 0 ? 'success' : 'danger'}
        />
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-zinc-900">Profit and Loss</h3>
        <Row label="Sales Revenue" value={money(p.revenue)} />
        <Row label="Less: Production Cost" value={money(p.productionCost)} tone="muted" />
        <Row
          label="Gross Profit"
          value={money(p.grossProfit)}
          strong
          separator
          tone={p.grossProfit >= 0 ? 'success' : 'danger'}
        />
        <Row label="Less: Selling Cost" value={money(p.sellingCost)} tone="muted" />
        <Row label="Less: Overhead Cost" value={money(p.overheadCost)} tone="muted" />
        <Row label="Less: Unclassified Expenses" value={money(p.unclassifiedCost)} tone="muted" />
        <Row
          label="Net Profit"
          value={money(p.netProfit)}
          strong
          separator
          tone={p.netProfit >= 0 ? 'success' : 'danger'}
        />
        <p className="mt-3 text-xs text-zinc-500">
          Accounting Net Profit = Sales Revenue − Total Expenses. Product cost in Product
          Performance uses cost recorded at sale time.
        </p>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-zinc-900">Product Profitability</h3>
          {data.productPerformance.length > 5 ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                if (showAll) onViewAllProducts()
                else setShowAll(true)
              }}
            >
              {showAll ? 'Open Products tab' : 'View All Products'}
            </Button>
          ) : null}
        </div>
        <ReportDataTable
          headers={[
            { key: 'product', label: 'Product' },
            { key: 'qty', label: 'Qty Sold', align: 'right' },
            { key: 'sales', label: 'Sales', align: 'right' },
            { key: 'cogs', label: 'Cost of Goods Sold', align: 'right' },
            { key: 'gp', label: 'Gross Profit', align: 'right' },
            { key: 'margin', label: 'Margin', align: 'right' },
          ]}
          rows={products.map((row) => ({
            key: row.product,
            cells: [
              row.product,
              row.quantitySold,
              money(row.salesAmount),
              money(row.cost),
              <span
                key="gp"
                className={cn(row.grossProfit >= 0 ? 'text-emerald-600' : 'text-red-600')}
              >
                {money(row.grossProfit)}
              </span>,
              `${row.margin.toFixed(1)}%`,
            ],
          }))}
          emptyMessage="No product sales for this period."
        />
      </section>
    </div>
  )
}
