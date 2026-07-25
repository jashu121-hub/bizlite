'use client'

import Link from 'next/link'

import { formatCurrency } from '@/lib/money'
import type { ReportTabId, ReportsData } from '@/lib/types/reports'
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

export function OverviewTab({
  data,
  currency,
  onNavigateTab,
}: {
  data: ReportsData
  currency: string
  onNavigateTab: (tab: ReportTabId) => void
}) {
  const money = (value: number) => formatCurrency(value, currency)
  const p = data.profit
  const costGroups = [
    { label: 'Production Cost', amount: data.expenses.production.total, pct: data.expenses.production.percentOfTotal },
    { label: 'Selling Cost', amount: data.expenses.selling.total, pct: data.expenses.selling.percentOfTotal },
    { label: 'Overhead Cost', amount: data.expenses.overhead.total, pct: data.expenses.overhead.percentOfTotal },
    { label: 'Unclassified Cost', amount: data.expenses.unclassifiedTotal, pct: data.expenses.unclassified.percentOfTotal },
  ]

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-zinc-900">Profit and Loss Summary</h3>
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
          <Row label="Less: Unclassified Cost" value={money(p.unclassifiedCost)} tone="muted" />
          <Row
            label="Net Profit"
            value={money(p.netProfit)}
            strong
            separator
            tone={p.netProfit >= 0 ? 'success' : 'danger'}
          />
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-zinc-900">Cost Structure</h3>
          <div className="mb-3 flex h-3 overflow-hidden rounded-full bg-zinc-100">
            {costGroups.map((group, index) =>
              group.amount > 0 ? (
                <div
                  key={group.label}
                  title={`${group.label}: ${group.pct.toFixed(1)}%`}
                  className={cn(
                    index === 0 && 'bg-teal-600',
                    index === 1 && 'bg-amber-500',
                    index === 2 && 'bg-zinc-500',
                    index === 3 && 'bg-red-400',
                  )}
                  style={{ width: `${Math.max(group.pct, 0)}%` }}
                />
              ) : null,
            )}
          </div>
          <div className="space-y-2">
            {costGroups.map((group) => (
              <div key={group.label} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-zinc-600">{group.label}</span>
                <span className="tabular-nums text-zinc-900">
                  {money(group.amount)}{' '}
                  <span className="text-xs text-zinc-500">({group.pct.toFixed(1)}%)</span>
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-zinc-900">Business Alerts</h3>
        {data.alerts.length === 0 ? (
          <p className="text-sm text-zinc-500">No alerts for this period.</p>
        ) : (
          <ul className="space-y-2">
            {data.alerts.map((alert) => {
              const className = cn(
                'block rounded-lg px-3 py-2 text-sm transition hover:bg-zinc-50',
                alert.tone === 'danger' ? 'text-red-700' : 'text-amber-800',
              )
              if (alert.href) {
                return (
                  <li key={alert.id}>
                    <Link href={alert.href} className={className}>
                      {alert.message}
                    </Link>
                  </li>
                )
              }
              return (
                <li key={alert.id}>
                  <button
                    type="button"
                    className={cn(className, 'w-full text-left')}
                    onClick={() => onNavigateTab(alert.tab)}
                  >
                    {alert.message}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
