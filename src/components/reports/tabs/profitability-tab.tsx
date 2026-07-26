'use client'

import { useState } from 'react'

import { CompactMetricCard } from '@/components/reports/compact-metric-card'
import { ReportDataTable } from '@/components/reports/report-data-table'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatDate } from '@/lib/dates'
import { formatCurrency } from '@/lib/money'
import type { ReportsData } from '@/lib/types/reports'
import { cn } from '@/lib/utils'

type BreakdownKey = 'selling' | 'overhead' | 'unclassified' | 'operating'

function Row({
  label,
  value,
  strong,
  tone,
  separator,
  onClick,
}: {
  label: string
  value: string
  strong?: boolean
  tone?: 'success' | 'danger' | 'muted'
  separator?: boolean
  onClick?: () => void
}) {
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-between gap-3 py-1.5 text-left text-sm',
        separator && 'mt-1 border-t border-zinc-200 pt-2',
        onClick && 'rounded-lg px-1 -mx-1 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600',
      )}
    >
      <span className={cn(strong ? 'font-medium text-zinc-900' : 'text-zinc-600')}>
        {label}
        {onClick ? <span className="ml-1 text-xs font-normal text-teal-700">View</span> : null}
      </span>
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
    </Comp>
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
  const [breakdown, setBreakdown] = useState<BreakdownKey | null>(null)
  const money = (value: number) => formatCurrency(value, currency)
  const p = data.profit
  const products = showAll ? data.productPerformance : data.productPerformance.slice(0, 5)

  const breakdownMeta: Record<
    BreakdownKey,
    { title: string; total: number; rows: typeof p.expenseTransactions.selling }
  > = {
    selling: {
      title: 'Selling Cost',
      total: p.sellingCost,
      rows: p.expenseTransactions.selling,
    },
    overhead: {
      title: 'Overhead Cost',
      total: p.overheadCost,
      rows: p.expenseTransactions.overhead,
    },
    unclassified: {
      title: 'Unclassified Expenses',
      total: p.unclassifiedCost,
      rows: p.expenseTransactions.unclassified,
    },
    operating: {
      title: 'Operating Expenses',
      total: p.operatingExpenses,
      rows: p.expenseTransactions.operating,
    },
  }

  const activeBreakdown = breakdown ? breakdownMeta[breakdown] : null

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
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-zinc-900">Profit and Loss</h3>
          <button
            type="button"
            className="text-xs font-medium text-teal-700 hover:underline"
            onClick={() => setBreakdown('operating')}
          >
            Operating Expenses {money(p.operatingExpenses)}
          </button>
        </div>
        <Row label="Sales Revenue" value={money(p.revenue)} />
        <Row label="Less: Production Cost" value={money(p.productionCost)} tone="muted" />
        <Row
          label="Gross Profit"
          value={money(p.grossProfit)}
          strong
          separator
          tone={p.grossProfit >= 0 ? 'success' : 'danger'}
        />
        <Row
          label="Less: Selling Cost"
          value={money(p.sellingCost)}
          tone="muted"
          onClick={() => setBreakdown('selling')}
        />
        <Row
          label="Less: Overhead Cost"
          value={money(p.overheadCost)}
          tone="muted"
          onClick={() => setBreakdown('overhead')}
        />
        <Row
          label="Less: Unclassified Expenses"
          value={money(p.unclassifiedCost)}
          tone="muted"
          onClick={() => setBreakdown('unclassified')}
        />
        <Row
          label="Net Profit"
          value={money(p.netProfit)}
          strong
          separator
          tone={p.netProfit >= 0 ? 'success' : 'danger'}
        />
        <p className="mt-3 text-xs text-zinc-500">
          Production Cost is Cost of Goods Sold from each sale line (quantity × unit cost saved at
          sale time). Unclassified Expenses only include expense transactions with no cost
          classification — never a residual of total expenses. Net Profit = Gross Profit − Selling −
          Overhead − Unclassified.
        </p>
        {process.env.NODE_ENV === 'development' && p.reconciliation && !p.reconciliation.ok ? (
          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Reconciliation warning: {p.reconciliation.messages.join(' ')}
          </p>
        ) : null}
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
              `${row.margin.toFixed(2)}%`,
            ],
          }))}
          emptyMessage="No product sales for this period."
        />
      </section>

      <Dialog open={breakdown !== null} onOpenChange={(open) => !open && setBreakdown(null)}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{activeBreakdown?.title}</DialogTitle>
            <DialogDescription>
              {data.range.label} · {money(activeBreakdown?.total ?? 0)}
            </DialogDescription>
          </DialogHeader>
          {activeBreakdown && activeBreakdown.rows.length === 0 ? (
            <p className="text-sm text-zinc-500">No expense transactions in this group.</p>
          ) : (
            <ul className="space-y-2">
              {activeBreakdown?.rows.map((row) => (
                <li
                  key={row.id}
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-zinc-900">{row.description || row.category}</p>
                      <p className="text-xs text-zinc-500">
                        {formatDate(row.date)} · {row.category}
                        {row.vendor ? ` · ${row.vendor}` : ''}
                      </p>
                      <p className="mt-0.5 font-mono text-[10px] text-zinc-400">{row.id}</p>
                    </div>
                    <p className="shrink-0 tabular-nums font-semibold text-zinc-900">
                      {money(row.amount)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
