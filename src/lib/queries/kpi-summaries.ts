import type { ExpenseCostType } from '@prisma/client'
import { format, startOfDay } from 'date-fns'

import {
  computeDashboardTotalCost,
  dashboardCostTypeLabel,
  type DashboardCostExpenseRow,
} from '@/lib/dashboard-total-cost'
import type { DateFilterPreset } from '@/lib/dates'
import type { PeriodComparison } from '@/lib/dashboard-date-range'
import { addMoney, money, moneyNumber, type MoneyInput } from '@/lib/money'
import type { KpiSummary, KpiType } from '@/lib/types/kpi'

export { validateDashboardTotalCost } from '@/lib/dashboard-total-cost'

/** @deprecated Use validateDashboardTotalCost */
export function validateOperatingExpenseKpi(input: {
  total: number
  transactionCount: number
  highestTransactionAmount: number
  categories: { name: string; amount: number; percent: number }[]
}): { ok: boolean; messages: string[] } {
  return {
    ok:
      input.highestTransactionAmount - input.total <= 0.005 &&
      input.categories.every((c) => c.percent - 100 <= 0.05),
    messages: [],
  }
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
  costType: ExpenseCostType | null
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
  /** All period cost expense rows (Production + Selling + Overhead + Unclassified). */
  totalCostExpenseRows: ExpenseRow[]
  /** Operating expenses only — used for Net Profit disclosure, not Total Cost. */
  operatingExpenseTotal: number
  pendingSalesAll: SaleRow[]
  products: ProductRow[]
  cards: {
    todaySales: number
    monthSales: number
    totalCost: number
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
      totalCost: PeriodComparison
      netProfit: PeriodComparison
    }
  }
  periodSalesTotal: number
  periodLabel: string
  firstCardTitle: string
  firstCardRangeLabel: string
  salesTitle: string
  totalCostTitle: string
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

  const totalCostResult = computeDashboardTotalCost(
    input.totalCostExpenseRows as DashboardCostExpenseRow[],
  )
  const totalCost =
    Math.abs(totalCostResult.totalCost - input.cards.totalCost) < 0.005
      ? input.cards.totalCost
      : totalCostResult.totalCost

  if (process.env.NODE_ENV !== 'production' && !totalCostResult.validation.ok) {
    console.warn('[dashboard] Total Cost KPI validation failed', totalCostResult.validation.messages)
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
    totalCost: {
      type: 'totalCost',
      title: input.totalCostTitle,
      rangeLabel: input.periodLabel,
      primaryValue: totalCost,
      rows: [
        { kind: 'count', label: 'Total entries', value: totalCostResult.entryCount },
        {
          kind: 'text',
          label: 'Highest category',
          value: totalCostResult.highestCategory
            ? `${totalCostResult.highestCategory.name} — ${totalCostResult.highestCategory.percent.toFixed(2)}%`
            : '—',
        },
        {
          kind: 'text',
          label: 'Highest transaction',
          value: totalCostResult.highestTransaction
            ? `${totalCostResult.highestTransaction.description} — ${format(totalCostResult.highestTransaction.date, 'dd MMM yyyy')}`
            : '—',
        },
        {
          kind: 'money',
          label: 'Highest transaction amount',
          value: totalCostResult.highestTransaction
            ? moneyNumber(totalCostResult.highestTransaction.amount)
            : 0,
        },
        {
          kind: 'text',
          label: 'vs previous period',
          value: input.cards.trends.totalCost.label,
          tone: comparisonTone(input.cards.trends.totalCost),
        },
      ],
      sections: [
        {
          id: 'by-cost-type',
          title: 'By Cost Type',
          defaultOpen: true,
          categories: totalCostResult.byCostType.map((row) => ({
            name: row.name,
            amount: row.amount,
            percent: row.percent,
          })),
        },
        {
          id: 'by-category',
          title: 'By Expense Category',
          defaultOpen: true,
          categories: totalCostResult.byCategory.map((row) => ({
            name: row.name,
            amount: row.amount,
            percent: row.percent,
          })),
        },
        {
          id: 'recent-entries',
          title: 'Recent Cost Entries',
          defaultOpen: false,
          listItems: totalCostResult.recentEntries.map((row) => ({
            id: row.id,
            primary: row.description || row.category.name,
            secondary: `${dashboardCostTypeLabel(row.costType)} · ${row.category.name}`,
            amount: moneyNumber(row.amount),
            meta: format(row.date, 'dd MMM yyyy'),
          })),
        },
      ],
      emptyMessage: 'No cost entries found for this period.',
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
        {
          kind: 'money',
          label: 'Operating expenses',
          value: input.operatingExpenseTotal,
        },
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
