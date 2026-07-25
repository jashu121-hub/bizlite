import Link from 'next/link'
import { AlertTriangle, ArrowRight, CreditCard, ReceiptText, ShoppingCart } from 'lucide-react'
import { DashboardCharts } from './dashboard-charts'
import { DashboardDateFilter } from './dashboard-date-filter'
import { PageHeader } from '@/components/shared/page-header'
import { SummaryCard } from '@/components/shared/summary-card'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { requireProfile } from '@/lib/auth'
import { getDashboardData } from '@/lib/queries/dashboard'
import { type DateFilterPreset, formatDate } from '@/lib/dates'

const presets = new Set<DateFilterPreset>(['month', 'ytd', 'year', 'lifetime', 'custom'])

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams
  const value = (key: string) => typeof params[key] === 'string' ? params[key] : undefined
  const preset = presets.has(value('preset') as DateFilterPreset) ? (value('preset') as DateFilterPreset) : 'month'
  const { profile, user } = await requireProfile()
  const data = await getDashboardData(user.id, preset, value('from'), value('to'))
  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description={`Business overview for ${data.range.label}`} actions={<div className="flex gap-2"><Button asChild><Link href="/sales/new"><ShoppingCart /> New sale</Link></Button><Button asChild variant="outline"><Link href="/expenses/new"><ReceiptText /> Expense</Link></Button></div>} />
      <DashboardDateFilter range={data.range} />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Today's sales" value={<CurrencyDisplay value={data.cards.todaySales} currency={profile.currency} />} icon={ShoppingCart} />
        <SummaryCard label="Month sales" value={<CurrencyDisplay value={data.cards.monthSales} currency={profile.currency} />} icon={CreditCard} />
        <SummaryCard label="Net profit" value={<CurrencyDisplay value={data.cards.netProfit} currency={profile.currency} />} icon={ArrowRight} />
        <SummaryCard label="Pending payments" value={<CurrencyDisplay value={data.cards.pendingPayments} currency={profile.currency} />} icon={AlertTriangle} />
      </section>
      <DashboardCharts charts={data.charts} currency={profile.currency} />
      <section className="grid gap-6 lg:grid-cols-2">
        <RecordList title="Recent sales" href="/sales" empty="No sales yet" rows={data.recentSales.map((sale) => ({ id: sale.id, title: sale.invoiceNumber, meta: `${sale.customer?.name ?? 'Walk-in'} · ${formatDate(sale.date)}`, value: <CurrencyDisplay value={sale.totalAmount} currency={profile.currency} /> }))} />
        <RecordList title="Recent expenses" href="/expenses" empty="No expenses yet" rows={data.recentExpenses.map((expense) => ({ id: expense.id, title: expense.description, meta: `${expense.category.replaceAll('_', ' ')} · ${formatDate(expense.date)}`, value: <CurrencyDisplay value={expense.amount} currency={profile.currency} /> }))} />
        <RecordList title="Low stock" href="/products" empty="All active products are stocked" rows={data.lowStock.map((product) => ({ id: product.id, title: product.name, meta: `${product.currentStock} remaining (alert at ${product.lowStockLevel})`, value: <Link className="text-teal-700 hover:underline" href={`/products/${product.id}`}>Manage</Link> }))} />
        <RecordList title="Pending balances" href="/customers" empty="No pending customer balances" rows={data.pendingCustomers.map((sale) => ({ id: sale.id, title: sale.customer?.name ?? 'Customer', meta: `${sale.invoiceNumber} · ${formatDate(sale.date)}`, value: <CurrencyDisplay value={sale.balancePending} currency={profile.currency} /> }))} />
      </section>
    </div>
  )
}

function RecordList({ title, href, empty, rows }: { title: string; href: string; empty: string; rows: { id: string; title: string; meta: string; value: React.ReactNode }[] }) {
  return <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-base">{title}</CardTitle><Button asChild variant="ghost" size="sm"><Link href={href}>View all</Link></Button></CardHeader><CardContent>{rows.length ? <div className="space-y-3">{rows.map((row) => <div key={row.id} className="flex items-center justify-between gap-3 border-b pb-3 last:border-0 last:pb-0"><div><p className="font-medium">{row.title}</p><p className="text-sm text-zinc-500">{row.meta}</p></div><div className="text-right font-medium">{row.value}</div></div>)}</div> : <p className="py-4 text-sm text-zinc-500">{empty}</p>}</CardContent></Card>
}
