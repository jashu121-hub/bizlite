'use client'

import * as React from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatCurrency } from '@/lib/money'
import { cn } from '@/lib/utils'

type Row = { name: string; value: number }

const COLORS = ['#0f766e', '#f59e0b', '#6366f1', '#ef4444', '#06b6d4', '#84cc16', '#a855f7']

export function DashboardCharts({
  charts,
  currency,
}: {
  charts: {
    salesVsExpenses: Row[]
    dailyNet: { name: string; value: number; sales?: number; expenses?: number }[]
    profitTrendGrouping?: 'day' | 'month' | 'year'
    expensesByCategory: Row[]
    expensesByCategoryOperating?: Row[]
    expensesByCategoryAll?: Row[]
    operatingExpensesTotal?: number
    allSpendingTotal?: number
    productionCostTotal?: number
  }
  currency: string
}) {
  const [spendView, setSpendView] = React.useState<'operating' | 'all'>('operating')
  const money = (value: number) => formatCurrency(value, currency)

  const operatingRows = charts.expensesByCategoryOperating ?? charts.expensesByCategory
  const allRows = charts.expensesByCategoryAll ?? charts.expensesByCategory
  const categoryRows = spendView === 'operating' ? operatingRows : allRows
  const expenseTotal =
    spendView === 'operating'
      ? (charts.operatingExpensesTotal ??
        categoryRows.reduce((sum, row) => sum + row.value, 0))
      : (charts.allSpendingTotal ?? categoryRows.reduce((sum, row) => sum + row.value, 0))

  const trendLabel =
    charts.profitTrendGrouping === 'year'
      ? 'Yearly net profit trend'
      : charts.profitTrendGrouping === 'month'
        ? 'Monthly net profit trend'
        : 'Daily net profit trend'

  return (
    <section className="grid gap-4 xl:grid-cols-3">
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm">
        <h3 className="mb-1 text-sm font-semibold text-zinc-800">Sales vs Expenses</h3>
        <p className="mb-4 text-xs text-zinc-500">
          Operating expenses only (excludes production / inventory purchases)
        </p>
        {charts.salesVsExpenses.every((r) => !r.value) ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={charts.salesVsExpenses} barSize={42}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} width={50} />
              <Tooltip formatter={(value) => money(Number(value))} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {charts.salesVsExpenses.map((row) => (
                  <Cell key={row.name} fill={row.name === 'Sales' ? '#0f766e' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm">
        <h3 className="mb-1 text-sm font-semibold text-zinc-800">Net Profit Overview</h3>
        <p className="mb-4 text-xs text-zinc-500">{trendLabel}</p>
        {!charts.dailyNet.length ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={charts.dailyNet}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} width={50} />
              <Tooltip formatter={(value) => money(Number(value))} />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#7c3aed"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-zinc-800">Expenses by Category</h3>
            <p className="mt-1 text-xs text-zinc-500">
              {spendView === 'operating'
                ? 'Operating expenses (Selling, Overhead, Unclassified)'
                : 'All cash spending (includes Production Cost)'}
            </p>
          </div>
          <div
            className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-0.5"
            role="group"
            aria-label="Expense category view"
          >
            <button
              type="button"
              onClick={() => setSpendView('operating')}
              className={cn(
                'rounded-md px-2.5 py-1 text-[11px] font-medium transition',
                spendView === 'operating'
                  ? 'bg-white text-teal-800 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-700',
              )}
            >
              Operating
            </button>
            <button
              type="button"
              onClick={() => setSpendView('all')}
              className={cn(
                'rounded-md px-2.5 py-1 text-[11px] font-medium transition',
                spendView === 'all'
                  ? 'bg-white text-teal-800 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-700',
              )}
            >
              All Spending
            </button>
          </div>
        </div>
        {!categoryRows.length ? (
          <EmptyChart />
        ) : (
          <div className="relative">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={categoryRows}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={58}
                  outerRadius={86}
                  paddingAngle={2}
                >
                  {categoryRows.map((row, index) => (
                    <Cell key={row.name} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => money(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-[11px] text-zinc-500">Total</p>
                <p className="text-sm font-bold text-zinc-800">{money(expenseTotal)}</p>
              </div>
            </div>
          </div>
        )}
        {categoryRows.length > 0 ? (
          <ul className="mt-2 space-y-1.5">
            {categoryRows.slice(0, 5).map((row, index) => {
              const pct = expenseTotal ? (row.value / expenseTotal) * 100 : 0
              return (
                <li key={row.name} className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex items-center gap-2 text-zinc-600">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: COLORS[index % COLORS.length] }}
                    />
                    {row.name}
                  </span>
                  <span className="font-medium tabular-nums text-zinc-800">
                    {pct.toFixed(2)}%
                  </span>
                </li>
              )
            })}
          </ul>
        ) : null}
      </div>
    </section>
  )
}

function EmptyChart() {
  return (
    <div className="flex h-[240px] items-center justify-center text-sm text-zinc-400">
      No data for this period
    </div>
  )
}
