'use client'

import { CsvExportButton } from '@/components/reports/csv-export-button'
import { ReportCard } from '@/components/shared/report-card'
import { formatCurrency } from '@/lib/money'
import { cn } from '@/lib/utils'

export function ProfitWaterfall({
  currency,
  profit,
}: {
  currency: string
  profit: {
    revenue: number
    productionCost: number
    grossProfit: number
    sellingCost: number
    profitAfterSelling: number
    overheadCost: number
    netProfit: number
    grossMargin: number | null
    netMargin: number | null
  }
}) {
  const money = (value: number) => formatCurrency(value, currency)

  return (
    <ReportCard title="Profit Report">
      <div className="space-y-3 text-sm">
        <Row label="Sales Revenue" value={money(profit.revenue)} />
        <Row label="Less: Production Cost" value={money(profit.productionCost)} muted />
        <Row
          label="Gross Profit"
          value={money(profit.grossProfit)}
          tone={profit.grossProfit >= 0 ? 'success' : 'danger'}
          strong
        />
        <Row label="Less: Selling Cost" value={money(profit.sellingCost)} muted />
        <Row
          label="Profit After Selling Costs"
          value={money(profit.profitAfterSelling)}
          tone={profit.profitAfterSelling >= 0 ? 'success' : 'danger'}
          strong
        />
        <Row label="Less: Overhead Cost" value={money(profit.overheadCost)} muted />
        <Row
          label="Net Profit"
          value={money(profit.netProfit)}
          tone={profit.netProfit >= 0 ? 'success' : 'danger'}
          strong
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg bg-zinc-50 p-3">
          <p className="text-xs text-zinc-500">Gross Profit Margin</p>
          <p
            className={cn(
              'mt-1 font-semibold',
              profit.grossMargin === null
                ? 'text-zinc-500'
                : profit.grossMargin >= 0
                  ? 'text-emerald-600'
                  : 'text-red-600',
            )}
          >
            {profit.grossMargin === null ? '—' : `${profit.grossMargin.toFixed(2)}%`}
          </p>
        </div>
        <div className="rounded-lg bg-zinc-50 p-3">
          <p className="text-xs text-zinc-500">Net Profit Margin</p>
          <p
            className={cn(
              'mt-1 font-semibold',
              profit.netMargin === null
                ? 'text-zinc-500'
                : profit.netMargin >= 0
                  ? 'text-emerald-600'
                  : 'text-red-600',
            )}
          >
            {profit.netMargin === null ? '—' : `${profit.netMargin.toFixed(2)}%`}
          </p>
        </div>
      </div>

      <p className="text-xs text-zinc-500">
        Production, selling, and overhead costs come from expense Cost Type for the selected
        period. Product Cost Price stays separate from selling and overhead costs.
      </p>

      <CsvExportButton
        filename="bizlite-profit-report.csv"
        headers={[
          'Sales Revenue',
          'Production Cost',
          'Gross Profit',
          'Selling Cost',
          'Profit After Selling Costs',
          'Overhead Cost',
          'Net Profit',
          'Gross Margin %',
          'Net Margin %',
        ]}
        rows={[
          [
            profit.revenue,
            profit.productionCost,
            profit.grossProfit,
            profit.sellingCost,
            profit.profitAfterSelling,
            profit.overheadCost,
            profit.netProfit,
            profit.grossMargin ?? '',
            profit.netMargin ?? '',
          ],
        ]}
      />
    </ReportCard>
  )
}

function Row({
  label,
  value,
  tone,
  muted,
  strong,
}: {
  label: string
  value: string
  tone?: 'success' | 'danger'
  muted?: boolean
  strong?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-zinc-100 pb-2 last:border-0">
      <span className={cn('text-zinc-600', strong && 'font-medium text-zinc-900')}>{label}</span>
      <span
        className={cn(
          'tabular-nums',
          muted && 'text-zinc-600',
          strong && 'font-semibold',
          tone === 'success' && 'text-emerald-600',
          tone === 'danger' && 'text-red-600',
          !tone && !muted && 'text-zinc-900',
        )}
      >
        {value}
      </span>
    </div>
  )
}
