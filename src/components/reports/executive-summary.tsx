'use client'

import {
  Banknote,
  Boxes,
  CreditCard,
  Percent,
  ReceiptText,
  TrendingUp,
  WalletCards,
} from 'lucide-react'
import { useState } from 'react'

import { CompactMetricCard } from '@/components/reports/compact-metric-card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/money'
import type { ReportTabId, ReportsData } from '@/lib/types/reports'

type SummaryKey =
  | 'sales'
  | 'gross'
  | 'net'
  | 'receivables'
  | 'expenses'
  | 'grossMargin'
  | 'netMargin'
  | 'stock'

export function ExecutiveSummary({
  data,
  currency,
  onNavigateTab,
}: {
  data: ReportsData
  currency: string
  onNavigateTab: (tab: ReportTabId) => void
}) {
  const [open, setOpen] = useState<SummaryKey | null>(null)
  const money = (value: number) => formatCurrency(value, currency)
  const s = data.summary

  const primary = [
    {
      key: 'sales' as const,
      label: 'Sales Revenue',
      value: money(s.sales),
      hint: `${data.sales.count} invoices`,
      icon: Banknote,
      tone: 'success' as const,
      tab: 'sales' as const,
    },
    {
      key: 'gross' as const,
      label: 'Gross Profit',
      value: money(s.grossProfit),
      hint: s.grossMargin === null ? 'No sales' : `${s.grossMargin.toFixed(2)}% margin`,
      icon: TrendingUp,
      tone: s.grossProfit >= 0 ? ('success' as const) : ('danger' as const),
      tab: 'profitability' as const,
    },
    {
      key: 'net' as const,
      label: 'Net Profit',
      value: money(s.netProfit),
      hint: s.netMargin === null ? 'No sales' : `${s.netMargin.toFixed(2)}% margin`,
      icon: WalletCards,
      tone: s.netProfit >= 0 ? ('success' as const) : ('danger' as const),
      tab: 'profitability' as const,
    },
    {
      key: 'receivables' as const,
      label: 'Receivables',
      value: money(s.customerReceivables),
      hint: `${s.receivablesCustomers} customers`,
      icon: CreditCard,
      tone: 'warning' as const,
      tab: 'receivables' as const,
    },
  ]

  const secondary = [
    {
      key: 'expenses' as const,
      label: 'Operating Expenses',
      value: money(s.expenses),
      hint: 'Selling + Overhead + Unclassified',
      icon: ReceiptText,
      tone: 'warning' as const,
      tab: 'expenses' as const,
    },
    {
      key: 'grossMargin' as const,
      label: 'Gross Margin',
      value: s.grossMargin === null ? '—' : `${s.grossMargin.toFixed(2)}%`,
      hint: 'Sales − COGS',
      icon: Percent,
      tone: (s.grossMargin ?? 0) >= 0 ? ('success' as const) : ('danger' as const),
      tab: 'profitability' as const,
    },
    {
      key: 'netMargin' as const,
      label: 'Net Margin',
      value: s.netMargin === null ? '—' : `${s.netMargin.toFixed(2)}%`,
      hint: 'After operating expenses',
      icon: Percent,
      tone: (s.netMargin ?? 0) >= 0 ? ('success' as const) : ('danger' as const),
      tab: 'profitability' as const,
    },
    {
      key: 'stock' as const,
      label: 'Current Stock Value',
      value: money(s.stockValue),
      hint: 'Current inventory',
      icon: Boxes,
      tone: 'info' as const,
      tab: 'inventory' as const,
    },
  ]

  const active = [...primary, ...secondary].find((item) => item.key === open)

  return (
    <section className="space-y-3" aria-label="Executive summary">
      <h2 className="text-sm font-semibold text-zinc-800">Executive Summary</h2>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-4">
        {primary.map((item) => (
          <CompactMetricCard
            key={item.key}
            label={item.label}
            value={item.value}
            hint={item.hint}
            icon={item.icon}
            tone={item.tone}
            onClick={() => setOpen(item.key)}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-4">
        {secondary.map((item) => (
          <CompactMetricCard
            key={item.key}
            label={item.label}
            value={item.value}
            hint={item.hint}
            icon={item.icon}
            tone={item.tone}
            onClick={() => setOpen(item.key)}
          />
        ))}
      </div>

      <Dialog open={open !== null} onOpenChange={(next) => !next && setOpen(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{active?.label}</DialogTitle>
            <DialogDescription>{data.range.label}</DialogDescription>
          </DialogHeader>
          <p className="text-2xl font-bold tabular-nums text-zinc-900">{active?.value}</p>
          {active?.hint ? <p className="text-sm text-zinc-500">{active.hint}</p> : null}
          <button
            type="button"
            className="mt-2 text-sm font-medium text-teal-700 hover:underline"
            onClick={() => {
              if (active) onNavigateTab(active.tab)
              setOpen(null)
            }}
          >
            View full details
          </button>
        </DialogContent>
      </Dialog>
    </section>
  )
}
