'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartCard } from '@/components/shared/chart-card'
import { formatCurrency } from '@/lib/money'

type Row = { name: string; value: number }

export function DashboardCharts({
  charts,
  currency,
}: {
  charts: { salesVsExpenses: Row[]; monthlyNet: Row[]; salesByProduct: Row[]; expensesByCategory: Row[] }
  currency: string
}) {
  const money = (value: number) => formatCurrency(value, currency)
  const tooltip = { formatter: ((value: unknown) => money(Number(Array.isArray(value) ? value[0] : value ?? 0))) as never }
  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <ChartCard title="Sales vs expenses" empty={!charts.salesVsExpenses.some((row) => row.value)}>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={charts.salesVsExpenses}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis tickFormatter={(v) => `${currency} ${v}`} /><Tooltip {...tooltip} /><Bar dataKey="value" fill="#0f766e" radius={[4, 4, 0, 0]} /></BarChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title="Monthly net profit" empty={!charts.monthlyNet.length}>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={charts.monthlyNet}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis tickFormatter={(v) => `${currency} ${v}`} /><Tooltip {...tooltip} /><Line type="monotone" dataKey="value" stroke="#0f766e" strokeWidth={2} /></LineChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title="Sales by product" empty={!charts.salesByProduct.length}>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={charts.salesByProduct} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" tickFormatter={(v) => `${currency} ${v}`} /><YAxis dataKey="name" type="category" width={100} /><Tooltip {...tooltip} /><Bar dataKey="value" fill="#2563eb" radius={[0, 4, 4, 0]} /></BarChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title="Expenses by category" empty={!charts.expensesByCategory.length}>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart><Pie data={charts.expensesByCategory} dataKey="value" nameKey="name" outerRadius={90} label>{charts.expensesByCategory.map((row, index) => <Cell key={row.name} fill={['#0f766e','#2563eb','#9333ea','#ea580c','#dc2626','#ca8a04'][index % 6]} />)}</Pie><Legend /><Tooltip {...tooltip} /></PieChart>
        </ResponsiveContainer>
      </ChartCard>
    </section>
  )
}
