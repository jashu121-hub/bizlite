import Link from 'next/link'
import {
  AlertTriangle,
  CheckCircle2,
  Plus,
} from 'lucide-react'
import { DashboardCharts } from './dashboard-charts'
import { DashboardDateFilter } from './dashboard-date-filter'
import { DashboardKpiCards } from './dashboard-kpi-cards'
import { StatusBadge } from '@/components/shared/status-badge'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { Button } from '@/components/ui/button'
import { requireProfile } from '@/lib/auth'
import { getDashboardData } from '@/lib/queries/dashboard'
import { type DateFilterPreset, formatDate } from '@/lib/dates'
import { expenseCategoryLabel } from '@/lib/labels'

const presets = new Set<DateFilterPreset>(['month', 'ytd', 'year', 'lifetime', 'custom'])

function greetingName(ownerName?: string | null) {
  const first = ownerName?.trim().split(/\s+/)[0]
  return first || 'Demo'
}

function timeGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const value = (key: string) => (typeof params[key] === 'string' ? params[key] : undefined)
  const preset = presets.has(value('preset') as DateFilterPreset)
    ? (value('preset') as DateFilterPreset)
    : 'month'
  const { profile, user } = await requireProfile()
  const data = await getDashboardData(user.id, preset, value('from'), value('to'))
  const name = greetingName(profile.ownerName)
  const currency = profile.currency

  const kpis = [
    {
      type: 'todaySales' as const,
      label: "Today's Sales",
      value: data.cards.todaySales,
      trend: data.cards.trends.todaySales,
      summary: data.kpiSummaries.todaySales,
    },
    {
      type: 'monthSales' as const,
      label: 'This Month Sales',
      value: data.cards.monthSales,
      trend: data.cards.trends.monthSales,
      summary: data.kpiSummaries.monthSales,
    },
    {
      type: 'monthExpenses' as const,
      label: 'This Month Expenses',
      value: data.cards.monthExpenses,
      trend: data.cards.trends.monthExpenses,
      summary: data.kpiSummaries.monthExpenses,
    },
    {
      type: 'netProfit' as const,
      label: 'Net Profit',
      value: data.cards.netProfit,
      trend: data.cards.trends.netProfit,
      danger: data.cards.netProfit < 0,
      summary: data.kpiSummaries.netProfit,
    },
    {
      type: 'pendingPayments' as const,
      label: 'Pending Payments',
      value: data.cards.pendingPayments,
      summary: data.kpiSummaries.pendingPayments,
    },
    {
      type: 'stockValue' as const,
      label: 'Stock Value',
      value: data.cards.stockValue,
      summary: data.kpiSummaries.stockValue,
    },
    {
      type: 'lowStock' as const,
      label: 'Low Stock Items',
      value: data.cards.lowStockCount,
      isCount: true,
      ok: data.cards.lowStockCount === 0,
      summary: data.kpiSummaries.lowStock,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-[1.75rem]">
            {timeGreeting()}, {name}! 👋
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Here&apos;s what&apos;s happening with your business today.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <DashboardDateFilter range={data.range} />
          <div className="flex gap-2">
            <Button asChild className="bg-[#0f766e] hover:bg-[#0d6a63]">
              <Link href="/sales/new">
                <Plus className="h-4 w-4" />
                New Sale
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/expenses/new">
                <Plus className="h-4 w-4" />
                Expense
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <DashboardKpiCards items={kpis} currency={currency} />

      <DashboardCharts charts={data.charts} currency={currency} />

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm lg:col-span-1">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-800">Recent Sales</h3>
            <Link href="/sales" className="text-xs font-medium text-teal-700 hover:underline">
              View all
            </Link>
          </div>
          {data.recentSales.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-400">No sales yet</p>
          ) : (
            <ul className="space-y-3">
              {data.recentSales.map((sale) => (
                <li key={sale.id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/sales/${sale.id}`}
                      className="truncate text-sm font-semibold text-zinc-800 hover:underline"
                    >
                      {sale.invoiceNumber}
                    </Link>
                    <p className="truncate text-xs text-zinc-500">
                      {sale.customer?.name ?? 'Walk-in Customer'} · {formatDate(sale.date)}
                    </p>
                    <div className="mt-1">
                      <StatusBadge status={sale.paymentStatus} />
                    </div>
                  </div>
                  <CurrencyDisplay
                    value={sale.totalAmount}
                    currency={currency}
                    className="shrink-0 text-sm font-semibold"
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-800">Recent Expenses</h3>
            <Link href="/expenses" className="text-xs font-medium text-teal-700 hover:underline">
              View all
            </Link>
          </div>
          {data.recentExpenses.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-400">No expenses yet</p>
          ) : (
            <ul className="space-y-3">
              {data.recentExpenses.map((expense) => (
                <li key={expense.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-800">
                      {expenseCategoryLabel(expense.category)}
                    </p>
                    <p className="truncate text-xs text-zinc-500">
                      {expense.description} · {formatDate(expense.date)}
                    </p>
                  </div>
                  <CurrencyDisplay
                    value={expense.amount}
                    currency={currency}
                    className="shrink-0 text-sm font-semibold"
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-800">Low Stock Alerts</h3>
            <Link href="/products" className="text-xs font-medium text-teal-700 hover:underline">
              View all
            </Link>
          </div>
          {data.lowStock.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-zinc-800">Great! No low stock items.</p>
              <p className="mt-1 text-xs text-zinc-500">All active products look healthy.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {data.lowStock.map((product) => (
                <li
                  key={product.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-red-50/70 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-800">{product.name}</p>
                    <p className="text-xs text-zinc-500">Alert at {product.lowStockLevel}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-sm font-bold text-red-600">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {product.currentStock}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

    </div>
  )
}
