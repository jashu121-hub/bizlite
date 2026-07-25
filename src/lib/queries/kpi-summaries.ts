import { format, startOfDay } from 'date-fns'
import { expenseCategoryLabel } from '@/lib/labels'
import { addMoney, money, moneyNumber, type MoneyInput } from '@/lib/money'
import type { DateFilterPreset } from '@/lib/dates'
import type { KpiSummary, KpiType } from '@/lib/types/kpi'

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : 100
  return ((current - previous) / Math.abs(previous)) * 100
}

function formatPct(value: number | null, suffix = 'vs last period') {
  if (value === null || value === undefined) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(0)}% ${suffix}`
}

function reportsHref(preset: DateFilterPreset, from?: string | null, to?: string | null) {
  const sp = new URLSearchParams()
  sp.set('range', preset)
  if (preset === 'custom') {
    if (from) sp.set('from', from)
    if (to) sp.set('to', to)
  }
  return `/reports?${sp.toString()}`
}

type SaleRow = {
  id: string
  date: Date
  totalAmount: MoneyInput
  amountPaid: MoneyInput
  balancePending: MoneyInput
  invoiceNumber: string
  paymentStatus: string
  customer: { name: string } | null
}

type ExpenseRow = {
  id: string
  date: Date
  amount: MoneyInput
  category: string
  description: string
}

type ProductRow = {
  id: string
  name: string
  currentStock: number
  lowStockLevel: number
  costPrice: MoneyInput
}

export function buildKpiSummaries(input: {
  todaySalesRows: SaleRow[]
  monthSalesRows: SaleRow[]
  monthExpenseRows: ExpenseRow[]
  pendingSalesAll: SaleRow[]
  products: ProductRow[]
  cards: {
    todaySales: number
    monthSales: number
    monthExpenses: number
    netProfit: number
    pendingPayments: number
    stockValue: number
    lowStockCount: number
    trends: {
      todaySales: number | null
      monthSales: number | null
      monthExpenses: number | null
      netProfit: number | null
    }
  }
  monthSalesTotal: number
  prevMonthSalesTotal: number
  prevMonthExpensesTotal: number
  prevMonthNet: number
  monthLabel: string
  todayLabel: string
  preset: DateFilterPreset
  customFrom?: string | null
  customTo?: string | null
}): Record<KpiType, KpiSummary> {
  const todayStart = startOfDay(new Date())
  const todayPaid = moneyNumber(addMoney(...input.todaySalesRows.map((s) => s.amountPaid)))
  const todayPending = moneyNumber(addMoney(...input.todaySalesRows.map((s) => s.balancePending)))
  const todayCount = input.todaySalesRows.length
  const todayAvg = todayCount > 0 ? input.cards.todaySales / todayCount : 0

  const monthPaid = moneyNumber(addMoney(...input.monthSalesRows.map((s) => s.amountPaid)))
  const monthPending = moneyNumber(addMoney(...input.monthSalesRows.map((s) => s.balancePending)))
  const monthCount = input.monthSalesRows.length
  const monthAvg = monthCount > 0 ? input.cards.monthSales / monthCount : 0

  const expenseCount = input.monthExpenseRows.length
  const expenseByCategory = new Map<string, number>()
  for (const exp of input.monthExpenseRows) {
    const label = expenseCategoryLabel(exp.category as never)
    expenseByCategory.set(
      label,
      moneyNumber(money(expenseByCategory.get(label) || 0).plus(money(exp.amount))),
    )
  }
  const topCategories = [...expenseByCategory.entries()]
    .map(([name, amount]) => ({
      name,
      amount,
      percent:
        input.cards.monthExpenses > 0 ? (amount / input.cards.monthExpenses) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
  const highestCategory = topCategories[0]
  const highestExpense = [...input.monthExpenseRows].sort(
    (a, b) => moneyNumber(b.amount) - moneyNumber(a.amount),
  )[0]

  const margin =
    input.monthSalesTotal > 0 ? (input.cards.netProfit / input.monthSalesTotal) * 100 : 0

  const overdue = input.pendingSalesAll.filter((s) => startOfDay(s.date) < todayStart)
  const overdueAmount = moneyNumber(addMoney(...overdue.map((s) => s.balancePending)))
  const nextExpected = [...input.pendingSalesAll].sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  )[0]
  const latestPending = [...input.pendingSalesAll]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 3)

  const totalQty = input.products.reduce((sum, p) => sum + p.currentStock, 0)
  const outOfStock = input.products.filter((p) => p.currentStock <= 0)
  const lowStock = input.products.filter((p) => p.currentStock <= p.lowStockLevel)
  const highestValueProduct = [...input.products]
    .map((p) => ({
      ...p,
      value: moneyNumber(money(p.costPrice).times(p.currentStock)),
    }))
    .sort((a, b) => b.value - a.value)[0]

  const todayIso = format(new Date(), 'yyyy-MM-dd')

  return {
    todaySales: {
      type: 'todaySales',
      title: "Today's Sales",
      rangeLabel: input.todayLabel,
      primaryValue: input.cards.todaySales,
      rows: [
        { kind: 'count', label: 'Invoices', value: todayCount },
        { kind: 'money', label: 'Paid amount', value: todayPaid, tone: 'success' },
        { kind: 'money', label: 'Pending amount', value: todayPending, tone: 'warning' },
        { kind: 'money', label: 'Average invoice', value: todayAvg },
      ],
      listTitle: 'Latest sales',
      listItems: input.todaySalesRows.slice(0, 3).map((s) => ({
        id: s.id,
        primary: s.invoiceNumber,
        secondary: s.customer?.name ?? 'Walk-in Customer',
        amount: moneyNumber(s.totalAmount),
        meta: format(s.date, 'dd MMM'),
      })),
      emptyMessage: 'No sales recorded today.',
      detailsHref: `/sales?preset=custom&from=${todayIso}&to=${todayIso}`,
    },
    monthSales: {
      type: 'monthSales',
      title: 'This Month Sales',
      rangeLabel: input.monthLabel,
      primaryValue: input.cards.monthSales,
      rows: [
        { kind: 'count', label: 'Invoices', value: monthCount },
        { kind: 'money', label: 'Paid sales', value: monthPaid, tone: 'success' },
        { kind: 'money', label: 'Pending sales', value: monthPending, tone: 'warning' },
        { kind: 'money', label: 'Average invoice', value: monthAvg },
        {
          kind: 'text',
          label: 'vs previous month',
          value: formatPct(pctChange(input.cards.monthSales, input.prevMonthSalesTotal)),
          tone:
            (pctChange(input.cards.monthSales, input.prevMonthSalesTotal) ?? 0) >= 0
              ? 'success'
              : 'danger',
        },
      ],
      emptyMessage: 'No sales recorded this month.',
      detailsHref: '/sales?preset=month',
    },
    monthExpenses: {
      type: 'monthExpenses',
      title: 'This Month Expenses',
      rangeLabel: input.monthLabel,
      primaryValue: input.cards.monthExpenses,
      rows: [
        { kind: 'count', label: 'Expense entries', value: expenseCount },
        {
          kind: 'text',
          label: 'Highest category',
          value: highestCategory
            ? `${highestCategory.name} (${highestCategory.percent.toFixed(0)}%)`
            : '—',
        },
        {
          kind: 'text',
          label: 'Highest transaction',
          value: highestExpense
            ? `${highestExpense.description} · ${format(highestExpense.date, 'dd MMM')}`
            : '—',
        },
        {
          kind: 'money',
          label: 'Highest transaction amount',
          value: highestExpense ? moneyNumber(highestExpense.amount) : 0,
        },
        {
          kind: 'text',
          label: 'vs previous month',
          value: formatPct(
            pctChange(input.cards.monthExpenses, input.prevMonthExpensesTotal),
          ),
          tone:
            (pctChange(input.cards.monthExpenses, input.prevMonthExpensesTotal) ?? 0) <= 0
              ? 'success'
              : 'danger',
        },
      ],
      categories: topCategories.slice(0, 3),
      emptyMessage: 'No expenses recorded this month.',
      detailsHref: '/expenses?preset=month',
    },
    netProfit: {
      type: 'netProfit',
      title: 'Net Profit',
      rangeLabel: input.monthLabel,
      primaryValue: input.cards.netProfit,
      primaryTone: input.cards.netProfit >= 0 ? 'success' : 'danger',
      rows: [
        { kind: 'money', label: 'Total sales', value: input.monthSalesTotal },
        { kind: 'money', label: 'Total expenses', value: input.cards.monthExpenses },
        {
          kind: 'money',
          label: input.cards.netProfit >= 0 ? 'Net profit' : 'Net loss',
          value: Math.abs(input.cards.netProfit),
          tone: input.cards.netProfit >= 0 ? 'success' : 'danger',
        },
        {
          kind: 'text',
          label: 'Profit margin',
          value: `${margin.toFixed(1)}%`,
          tone: margin >= 0 ? 'success' : 'danger',
        },
        {
          kind: 'text',
          label: 'vs previous period',
          value: formatPct(pctChange(input.cards.netProfit, input.prevMonthNet)),
          tone:
            (pctChange(input.cards.netProfit, input.prevMonthNet) ?? 0) >= 0
              ? 'success'
              : 'danger',
        },
      ],
      emptyMessage: 'No profit data for this period.',
      detailsHref: reportsHref(input.preset, input.customFrom, input.customTo),
    },
    pendingPayments: {
      type: 'pendingPayments',
      title: 'Pending Payments',
      rangeLabel: 'Outstanding',
      primaryValue: input.cards.pendingPayments,
      primaryTone: input.cards.pendingPayments > 0 ? 'warning' : 'success',
      rows: [
        { kind: 'count', label: 'Pending invoices', value: input.pendingSalesAll.length },
        { kind: 'money', label: 'Overdue amount', value: overdueAmount, tone: 'danger' },
        { kind: 'count', label: 'Overdue invoices', value: overdue.length, tone: 'danger' },
        {
          kind: 'text',
          label: 'Next expected payment',
          value: nextExpected
            ? `${nextExpected.invoiceNumber} · ${format(nextExpected.date, 'dd MMM yyyy')}`
            : '—',
        },
      ],
      listTitle: 'Latest pending invoices',
      listItems: latestPending.map((s) => ({
        id: s.id,
        primary: s.invoiceNumber,
        secondary: s.customer?.name ?? 'Customer',
        amount: moneyNumber(s.balancePending),
        meta: format(s.date, 'dd MMM'),
        tone: startOfDay(s.date) < todayStart ? 'danger' : 'warning',
      })),
      emptyMessage: 'No pending payments.',
      detailsHref: '/sales?outstanding=1&preset=lifetime',
    },
    stockValue: {
      type: 'stockValue',
      title: 'Stock Value',
      rangeLabel: 'Inventory',
      primaryValue: input.cards.stockValue,
      rows: [
        { kind: 'count', label: 'Total quantity', value: totalQty },
        { kind: 'count', label: 'Active products', value: input.products.length },
        {
          kind: 'text',
          label: 'Highest-value product',
          value: highestValueProduct?.name ?? '—',
        },
        {
          kind: 'money',
          label: 'Highest product value',
          value: highestValueProduct?.value ?? 0,
        },
        {
          kind: 'count',
          label: 'Out of stock',
          value: outOfStock.length,
          tone: outOfStock.length ? 'danger' : 'success',
        },
        {
          kind: 'count',
          label: 'Low stock',
          value: lowStock.length,
          tone: lowStock.length ? 'warning' : 'success',
        },
      ],
      emptyMessage: 'No active products in inventory.',
      detailsHref: '/products',
    },
    lowStock: {
      type: 'lowStock',
      title: 'Low Stock Items',
      rangeLabel: 'Inventory alerts',
      primaryValue: input.cards.lowStockCount,
      primaryIsCount: true,
      primaryTone: input.cards.lowStockCount > 0 ? 'danger' : 'success',
      rows: [
        { kind: 'count', label: 'Low-stock items', value: lowStock.length },
        {
          kind: 'count',
          label: 'Out of stock',
          value: outOfStock.length,
          tone: outOfStock.length ? 'danger' : 'success',
        },
      ],
      listTitle: 'Items needing attention',
      listItems: lowStock.slice(0, 5).map((p) => ({
        id: p.id,
        primary: p.name,
        secondary: `Alert at ${p.lowStockLevel}`,
        count: p.currentStock,
        tone: p.currentStock <= 0 ? 'danger' : 'warning',
        meta: `Qty ${p.currentStock}`,
      })),
      emptyMessage: 'All active products look healthy.',
      detailsHref: '/products?stock=low',
    },
  }
}
