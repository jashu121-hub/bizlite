'use client'

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
    totalCost?: number
  }
  currency: string
}) {
  const money = (value: number) => formatCurrency(value, currency)
  const expenseTotal =
    charts.totalCost ?? charts.expensesByCategory.reduce((sum, row) => sum + row.value, 0)
  const trendLabel =
    charts.profitTrendGrouping === 'year'
      ? 'Yearly net profit trend'
      : charts.profitTrendGrouping === 'month'
        ? 'Monthly net profit trend'
        : 'Daily net profit trend'

  return (
    <section className="grid gap-4 xl:grid-cols-3">
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm">
        <h3 className="mb-1 text-sm font-semibold text-zinc-800">Sales vs Total Cost</h3>
        <p className="mb-4 text-xs text-zinc-500">
          Sales compared with production and operating costs
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
        <h3 className="mb-1 text-sm font-semibold text-zinc-800">Total Cost by Category</h3>
        <p className="mb-4 text-xs text-zinc-500">COGS and operating expenses</p>
        {!charts.expensesByCategory.length ? (
          <EmptyChart />
        ) : (
          <div className="relative">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={charts.expensesByCategory}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={58}
                  outerRadius={86}
                  paddingAngle={2}
                >
                  {charts.expensesByCategory.map((row, index) => (
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
        {charts.expensesByCategory.length > 0 ? (
          <ul className="mt-2 space-y-1.5">
            {charts.expensesByCategory.slice(0, 5).map((row, index) => {
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
