'use client'

import { useMemo, useState } from 'react'

import { ReportDataTable } from '@/components/reports/report-data-table'
import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/lib/money'
import type { ReportsData } from '@/lib/types/reports'
import { cn } from '@/lib/utils'

type SortKey = 'revenue' | 'profit' | 'margin'

export function ProductsTab({ data, currency }: { data: ReportsData; currency: string }) {
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<SortKey>('revenue')
  const [filter, setFilter] = useState<'all' | 'loss' | 'zero'>('all')
  const money = (value: number) => formatCurrency(value, currency)

  const rows = useMemo(() => {
    let list = [...data.productPerformance]
    if (q.trim()) {
      const needle = q.trim().toLowerCase()
      list = list.filter((row) => row.product.toLowerCase().includes(needle))
    }
    if (filter === 'loss') list = list.filter((row) => row.status === 'Loss')
    if (filter === 'zero') list = list.filter((row) => row.status === 'Zero Margin')
    list.sort((a, b) => {
      if (sort === 'profit') return b.grossProfit - a.grossProfit
      if (sort === 'margin') return b.margin - a.margin
      return b.salesAmount - a.salesAmount
    })
    return list
  }, [data.productPerformance, q, sort, filter])

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm sm:flex-row sm:flex-wrap sm:items-center">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search product"
          className="h-9 sm:max-w-xs"
        />
        <select
          className="h-9 rounded-md border bg-transparent px-3 text-sm"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
        >
          <option value="revenue">Sort by Revenue</option>
          <option value="profit">Sort by Profit</option>
          <option value="margin">Sort by Margin</option>
        </select>
        <select
          className="h-9 rounded-md border bg-transparent px-3 text-sm"
          value={filter}
          onChange={(e) => setFilter(e.target.value as 'all' | 'loss' | 'zero')}
        >
          <option value="all">All products</option>
          <option value="loss">Show Loss-Making Products</option>
          <option value="zero">Show Zero-Margin Products</option>
        </select>
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <ReportDataTable
          headers={[
            { key: 'product', label: 'Product' },
            { key: 'qty', label: 'Quantity Sold', align: 'right' },
            { key: 'revenue', label: 'Revenue', align: 'right' },
            { key: 'cost', label: 'Cost', align: 'right' },
            { key: 'gp', label: 'Gross Profit', align: 'right' },
            { key: 'margin', label: 'Margin', align: 'right' },
            { key: 'status', label: 'Status' },
          ]}
          rows={rows.map((row) => ({
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
              <StatusBadge key="st" status={row.status} />,
            ],
          }))}
          emptyMessage="No product performance data for this period."
        />
      </section>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === 'High Margin'
      ? 'bg-emerald-50 text-emerald-700'
      : status === 'Healthy'
        ? 'bg-teal-50 text-teal-700'
        : status === 'Low Margin'
          ? 'bg-amber-50 text-amber-800'
          : status === 'Zero Margin'
            ? 'bg-zinc-100 text-zinc-700'
            : 'bg-red-50 text-red-700'
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', tone)}>{status}</span>
  )
}
