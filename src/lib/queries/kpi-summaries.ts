import { format, startOfDay } from 'date-fns'
import { addMoney, money, moneyNumber, type MoneyInput } from '@/lib/money'
import type { DateFilterPreset } from '@/lib/dates'
import type { PeriodComparison } from '@/lib/dashboard-date-range'
import type { KpiSummary, KpiType } from '@/lib/types/kpi'

/** Dev-time checks so operating-expense KPI popup never mixes PRODUCTION totals. */
export function validateOperatingExpenseKpi(input: {
  total: number
  transactionCount: number
  highestTransactionAmount: number
  categories: { name: string; amount: number; percent: number }[]
}): { ok: boolean; messages: string[] } {
  const messages: string[] = []
  if (input.highestTransactionAmount - input.total > 0.005) {
    messages.push(
      `Highest transaction (${input.highestTransactionAmount}) exceeds operating expense total (${input.total}).`,
    )
  }
  for (const category of input.categories) {
    if (category.percent - 100 > 0.05) {
      messages.push(`Category ${category.name} percent ${category.percent} exceeds 100%.`)
    }
  }
  if (input.categories.length > 0 && input.total > 0) {
    const percentTotal = input.categories.reduce((sum, category) => sum + category.percent, 0)
    if (Math.abs(percentTotal - 100) > 0.15) {
      messages.push(`Category percents total ${percentTotal.toFixed(2)}% (expected ~100%).`)
    }
  }
  if (input.transactionCount < 0) {
    messages.push('Transaction count cannot be negative.')
  }
  return { ok: messages.length === 0, messages }
}

function reportsHref(
  preset: DateFilterPreset,
  from?: string | null,
  to?: string | null,
  year?: number,
  month?: number,
) {
  const sp = new URLSearchParams()
  sp.set('range', preset)
  if (preset === 'custom') {
    if (from) sp.set('from', from)
    if (to) sp.set('to', to)
  } else if (preset !== 'lifetime') {
    if (year) sp.set('year', String(year))
    if (preset === 'month' && month) sp.set('month', String(month))
  }
  return `/reports?${sp.toString()}`
}

function listHref(
  base: '/sales' | '/expenses',
  preset: DateFilterPreset,
  from?: string | null,
  to?: string | null,
  year?: number,
  month?: number,
) {
  const sp = new URLSearchParams()
  sp.set('preset', preset)
  if (preset === 'custom') {
    if (from) sp.set('from', from)
    if (to) sp.set('to', to)
  } else if (preset !== 'lifetime') {
    if (year) sp.set('year', String(year))
    if (preset === 'month' && month) sp.set('month', String(month))
  }
  return `${base}?${sp.toString()}`
}

function comparisonTone(
  comparison: PeriodComparison,
): 'default' | 'success' | 'danger' | 'warning' {
  if (comparison.favourable === true) return 'success'
  if (comparison.favourable === false) return 'danger'
  return 'default'
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
  category: { name: string }
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
  periodSalesRows: SaleRow[]
  periodExpenseRows: ExpenseRow[]
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
    periodPaid: number
    periodPending: number
    periodInvoiceCount: number
    trends: {
      todaySales: PeriodComparison
      monthSales: PeriodComparison
      monthExpenses: PeriodComparison
      netProfit: PeriodComparison
    }
  }
  periodSalesTotal: number
  prevPeriodSalesTotal: number
  prevPeriodExpensesTotal: number
  prevPeriodNet: number
  periodLabel: string
  firstCardTitle: string
  firstCardRangeLabel: string
  salesTitle: string
  expensesTitle: string
  isTodayFirstCard: boolean
  periodType: DateFilterPreset
  customFrom?: string | null
  customTo?: string | null
  year?: number
  month?: number
}): Record<KpiType, KpiSummary> {
  const todayStart = startOfDay(new Date())
  const firstPaid = moneyNumber(addMoney(...input.todaySalesRows.map((s) => s.amountPaid)))
  const firstPending = moneyNumber(
    addMoney(...input.todaySalesRows.map((s) => s.balancePending)),
  )
  const firstCount = input.todaySalesRows.length
  const firstAvg = firstCount > 0 ? input.cards.todaySales / firstCount : 0

  const periodPaid = input.cards.periodPaid
  const periodPending = input.cards.periodPending
  const periodCount = input.cards.periodInvoiceCount
  const periodAvg = periodCount > 0 ? input.cards.monthSales / periodCount : 0

  // Caller must pass operating expenses only (Selling + Overhead + Unclassified).
  const operatingExpenseRows = input.periodExpenseRows
  const operatingExpenseTotal = moneyNumber(
    addMoney(...operatingExpenseRows.map((exp) => exp.amount)),
  )
  // Prefer the sum of the same rows used for counts/categories so popup never drifts.
  const expenseKpiTotal =
    Math.abs(operatingExpenseTotal - input.cards.monthExpenses) < 0.005
      ? input.cards.monthExpenses
      : operatingExpenseTotal
  const expenseCount = operatingExpenseRows.length
  const expenseByCategory = new Map<string, number>()
  for (const exp of operatingExpenseRows) {
    const label = exp.category.name
    expenseByCategory.set(
      label,
      moneyNumber(money(expenseByCategory.get(label) || 0).plus(money(exp.amount))),
    )
  }
  const topCategories = [...expenseByCategory.entries()]
    .map(([name, amount]) => ({
      name,
      amount,
      percent: expenseKpiTotal > 0 ? (amount / expenseKpiTotal) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
  const highestCategory = topCategories[0]
  const highestExpense = [...operatingExpenseRows].sort(
    (a, b) => moneyNumber(b.amount) - moneyNumber(a.amount),
  )[0]
  const expenseValidation = validateOperatingExpenseKpi({
    total: expenseKpiTotal,
    transactionCount: expenseCount,
    highestTransactionAmount: highestExpense ? moneyNumber(highestExpense.amount) : 0,
    categories: topCategories,
  })
  if (process.env.NODE_ENV !== 'production' && !expenseValidation.ok) {
    console.warn('[dashboard] Operating expense KPI validation failed', expenseValidation.messages)
  }

  const margin =
    input.periodSalesTotal > 0 ? (input.cards.netProfit / input.periodSalesTotal) * 100 : 0

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
  const salesDetails = input.isTodayFirstCard
    ? `/sales?preset=custom&from=${todayIso}&to=${todayIso}`
    : listHref(
        '/sales',
        input.periodType,
        input.customFrom,
        input.customTo,
        input.year,
        input.month,
      )

  return {
    todaySales: {
      type: 'todaySales',
      title: input.firstCardTitle,
      rangeLabel: input.firstCardRangeLabel,
      primaryValue: input.cards.todaySales,
      rows: input.isTodayFirstCard
        ? [
            { kind: 'count', label: 'Invoices', value: firstCount },
            { kind: 'money', label: 'Paid amount', value: firstPaid, tone: 'success' },
            { kind: 'money', label: 'Pending amount', value: firstPending, tone: 'warning' },
            { kind: 'money', label: 'Average invoice', value: firstAvg },
          ]
        : [
            { kind: 'count', label: 'Invoices', value: periodCount },
            { kind: 'money', label: 'Paid amount', value: periodPaid, tone: 'success' },
            { kind: 'money', label: 'Pending amount', value: periodPending, tone: 'warning' },
            { kind: 'money', label: 'Average invoice', value: periodAvg },
            {
              kind: 'text',
              label: 'vs previous period',
              value: input.cards.trends.todaySales.label,
              tone: comparisonTone(input.cards.trends.todaySales),
            },
          ],
      listTitle: 'Latest sales',
      listItems: input.todaySalesRows.slice(0, 3).map((s) => ({
        id: s.id,
        primary: s.invoiceNumber,
        secondary: s.customer?.name ?? 'Walk-in Customer',
        amount: moneyNumber(s.totalAmount),
        meta: format(s.date, 'dd MMM'),
      })),
      emptyMessage: input.isTodayFirstCard
        ? 'No sales recorded today.'
        : 'No sales found for this period.',
      detailsHref: salesDetails,
    },
    monthSales: {
      type: 'monthSales',
      title: input.salesTitle,
      rangeLabel: input.periodLabel,
      primaryValue: input.cards.monthSales,
      rows: [
        { kind: 'count', label: 'Invoices', value: periodCount },
        { kind: 'money', label: 'Paid sales', value: periodPaid, tone: 'success' },
        { kind: 'money', label: 'Pending sales', value: periodPending, tone: 'warning' },
        { kind: 'money', label: 'Average invoice', value: periodAvg },
        {
          kind: 'text',
          label: 'vs previous period',
          value: input.cards.trends.monthSales.label,
          tone: comparisonTone(input.cards.trends.monthSales),
        },
      ],
      emptyMessage: 'No sales found for this period.',
      detailsHref: listHref(
        '/sales',
        input.periodType,
        input.customFrom,
        input.customTo,
        input.year,
        input.month,
      ),
    },
    monthExpenses: {
      type: 'monthExpenses',
      title: input.expensesTitle,
      rangeLabel: input.periodLabel,
      primaryValue: expenseKpiTotal,
      rows: [
        { kind: 'count', label: 'Expense entries', value: expenseCount },
        {
          kind: 'text',
          label: 'Highest category',
          value: highestCategory
            ? `${highestCategory.name} (${highestCategory.percent.toFixed(2)}%)`
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
          label: 'vs previous period',
          value: input.cards.trends.monthExpenses.label,
          tone: comparisonTone(input.cards.trends.monthExpenses),
        },
      ],
      categories: topCategories.slice(0, 3),
      emptyMessage: 'No operating expenses found for this period.',
      detailsHref: listHref(
        '/expenses',
        input.periodType,
        input.customFrom,
        input.customTo,
        input.year,
        input.month,
      ),
    },
    netProfit: {
      type: 'netProfit',
      title: 'Net Profit',
      rangeLabel: input.periodLabel,
      primaryValue: input.cards.netProfit,
      primaryTone: input.cards.netProfit >= 0 ? 'success' : 'danger',
      rows: [
        { kind: 'money', label: 'Total sales', value: input.periodSalesTotal },
        { kind: 'money', label: 'Operating expenses', value: expenseKpiTotal },
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
          value: input.cards.trends.netProfit.label,
          tone: comparisonTone(input.cards.trends.netProfit),
        },
      ],
      emptyMessage: 'No profit data for this period.',
      detailsHref: reportsHref(
        input.periodType,
        input.customFrom,
        input.customTo,
        input.year,
        input.month,
      ),
    },
    pendingPayments: {
      type: 'pendingPayments',
      title: 'Pending Payments',
      rangeLabel: input.periodLabel,
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
      emptyMessage: 'No pending payments for this period.',
      detailsHref: `${listHref(
        '/sales',
        input.periodType,
        input.customFrom,
        input.customTo,
        input.year,
        input.month,
      )}&outstanding=1`,
    },
    stockValue: {
      type: 'stockValue',
      title: 'Stock Value',
      rangeLabel: 'Current',
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
      rangeLabel: 'Current',
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
