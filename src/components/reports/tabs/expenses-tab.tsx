'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

import { CompactMetricCard } from '@/components/reports/compact-metric-card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/money'
import type { ReportsData } from '@/lib/types/reports'
import { cn } from '@/lib/utils'

type GroupKey = 'production' | 'selling' | 'overhead' | 'unclassified'

export function ExpensesTab({ data, currency }: { data: ReportsData; currency: string }) {
  const [open, setOpen] = useState<GroupKey | null>('production')
  const money = (value: number) => formatCurrency(value, currency)

  const groups: {
    key: GroupKey
    title: string
    total: number
    pct: number
    breakdown: ReportsData['expenses']['production']['breakdown']
  }[] = [
    {
      key: 'production',
      title: 'Production Cost Breakdown',
      total: data.expenses.production.total,
      pct: data.expenses.production.percentOfTotal,
      breakdown: data.expenses.production.breakdown,
    },
    {
      key: 'selling',
      title: 'Selling Cost Breakdown',
      total: data.expenses.selling.total,
      pct: data.expenses.selling.percentOfTotal,
      breakdown: data.expenses.selling.breakdown,
    },
    {
      key: 'overhead',
      title: 'Overhead Cost Breakdown',
      total: data.expenses.overhead.total,
      pct: data.expenses.overhead.percentOfTotal,
      breakdown: data.expenses.overhead.breakdown,
    },
    {
      key: 'unclassified',
      title: 'Unclassified Expenses',
      total: data.expenses.unclassifiedTotal,
      pct: data.expenses.unclassified.percentOfTotal,
      breakdown: data.expenses.unclassified.breakdown,
    },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
        <CompactMetricCard
          label="Operating Expenses"
          value={money(data.expenses.operatingTotal ?? data.expenses.total)}
          hint="Selling + Overhead + Unclassified"
          tone="warning"
        />
        <CompactMetricCard
          label="Production Expenses"
          value={money(data.expenses.production.total)}
          hint="Recorded production expenses (not COGS)"
        />
        <CompactMetricCard label="Selling Cost" value={money(data.expenses.selling.total)} />
        <CompactMetricCard label="Overhead Cost" value={money(data.expenses.overhead.total)} />
        <CompactMetricCard
          label="Unclassified Cost"
          value={money(data.expenses.unclassifiedTotal)}
          tone={data.expenses.unclassifiedTotal > 0 ? 'warning' : 'default'}
        />
        <CompactMetricCard
          label="Number of Expenses"
          value={data.expenses.recordedCount ?? data.expenses.count}
        />
        <CompactMetricCard label="Average Expense" value={money(data.expenses.average)} />
      </div>

      {data.expenses.needsClassificationCount > 0 ? (
        <div className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-amber-900">
            {data.expenses.needsClassificationCount} expense
            {data.expenses.needsClassificationCount === 1 ? '' : 's'} need classification (
            {money(data.expenses.unclassifiedTotal)}).
          </p>
          <Button asChild size="sm" variant="outline">
            <Link href="/expenses?needsClassification=1">Review and Classify</Link>
          </Button>
        </div>
      ) : null}

      <section className="space-y-2 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
        {groups.map((group) => {
          const isOpen = open === group.key
          return (
            <div key={group.key} className="rounded-lg border border-zinc-100">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
                onClick={() => setOpen(isOpen ? null : group.key)}
              >
                <div>
                  <p className="text-sm font-semibold text-zinc-900">{group.title}</p>
                  <p className="text-xs text-zinc-500">
                    {money(group.total)} · {group.pct.toFixed(1)}% of total
                  </p>
                </div>
                <ChevronDown
                  className={cn('h-4 w-4 text-zinc-500 transition', isOpen && 'rotate-180')}
                />
              </button>
              {isOpen ? (
                <div className="space-y-1.5 border-t border-zinc-100 px-3 py-2.5">
                  {group.breakdown.length === 0 ? (
                    <p className="text-sm text-zinc-500">No expenses in this group.</p>
                  ) : (
                    group.breakdown.map((row) => (
                      <div
                        key={row.key}
                        className="flex flex-col gap-0.5 text-sm sm:flex-row sm:items-center sm:justify-between"
                      >
                        <span className="text-zinc-700">{row.label}</span>
                        <div className="flex flex-wrap gap-x-3 text-xs text-zinc-500">
                          <span className="font-semibold tabular-nums text-zinc-900">
                            {money(row.amount)}
                          </span>
                          <span>{row.percentOfGroup.toFixed(1)}% of group</span>
                          <span>{row.percentOfTotal.toFixed(1)}% of total</span>
                        </div>
                      </div>
                    ))
                  )}
                  {group.key === 'unclassified' && group.total > 0 ? (
                    <Button asChild size="sm" variant="outline" className="mt-2">
                      <Link href="/expenses?needsClassification=1">Review and Classify</Link>
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          )
        })}
      </section>
    </div>
  )
}
