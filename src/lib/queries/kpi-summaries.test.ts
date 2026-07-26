import { describe, expect, it } from 'vitest'

import {
  buildKpiSummaries,
  validateOperatingExpenseKpi,
} from '@/lib/queries/kpi-summaries'
import type { PeriodComparison } from '@/lib/dashboard-date-range'

const neutralTrend: PeriodComparison = {
  percent: null,
  label: 'No previous period',
  favourable: null,
}

function baseInput(options: {
  operating: {
    id: string
    date: Date
    amount: string
    category: { name: string }
    description: string
  }[]
  production: {
    id: string
    date: Date
    amount: string
    category: { name: string }
    description: string
  }[]
  periodCogs?: number
}) {
  const operatingTotal = options.operating.reduce((sum, row) => sum + Number(row.amount), 0)
  const productionTotal = options.production.reduce((sum, row) => sum + Number(row.amount), 0)
  return {
    todaySalesRows: [],
    periodSalesRows: [],
    periodExpenseRows: options.operating,
    productionExpenseRows: options.production,
    pendingSalesAll: [],
    products: [],
    cards: {
      todaySales: 0,
      monthSales: 1000,
      monthExpenses: operatingTotal,
      productionCost: productionTotal,
      periodCogs: options.periodCogs ?? 375,
      netProfit: 825,
      pendingPayments: 0,
      stockValue: 0,
      lowStockCount: 0,
      periodPaid: 1000,
      periodPending: 0,
      periodInvoiceCount: 1,
      trends: {
        todaySales: neutralTrend,
        monthSales: neutralTrend,
        monthExpenses: neutralTrend,
        productionCost: neutralTrend,
        netProfit: neutralTrend,
      },
    },
    periodSalesTotal: 1000,
    prevPeriodSalesTotal: 0,
    prevPeriodExpensesTotal: 0,
    prevPeriodNet: 0,
    periodLabel: 'July 2026',
    firstCardTitle: "Today's Sales",
    firstCardRangeLabel: '25 Jul 2026',
    salesTitle: 'This Month Sales',
    expensesTitle: 'This Month Operating Expenses',
    productionCostTitle: 'This Month Production Cost',
    isTodayFirstCard: true,
    periodType: 'month' as const,
    year: 2026,
    month: 7,
  }
}

describe('operating expense KPI summary', () => {
  it('uses only operating expense rows for totals, counts, and percentages', () => {
    const summaries = buildKpiSummaries(
      baseInput({
        operating: [
          {
            id: 'e1',
            date: new Date(2026, 6, 25),
            amount: '100.00',
            category: { name: 'Customer Delivery' },
            description: 'Transportation',
          },
          {
            id: 'e2',
            date: new Date(2026, 6, 20),
            amount: '75.00',
            category: { name: 'Salary' },
            description: 'July salary',
          },
        ],
        production: [
          {
            id: 'p1',
            date: new Date(2026, 6, 25),
            amount: '300.00',
            category: { name: 'Materials' },
            description: 'materials',
          },
        ],
      }),
    )

    const operating = summaries.monthExpenses
    expect(operating.title).toBe('This Month Operating Expenses')
    expect(operating.primaryValue).toBe(175)
    expect(operating.rows.find((row) => row.label === 'Expense entries')?.value).toBe(2)
    expect(operating.categories).toEqual([
      { name: 'Customer Delivery', amount: 100, percent: expect.closeTo(57.14, 2) },
      { name: 'Salary', amount: 75, percent: expect.closeTo(42.86, 2) },
    ])

    const production = summaries.productionCost
    expect(production.title).toBe('This Month Production Cost')
    expect(production.primaryValue).toBe(300)
    expect(production.rows.find((row) => row.label === 'Production entries')?.value).toBe(1)
    expect(production.rows.find((row) => row.label === 'Highest category')?.value).toBe(
      'Materials — 100.00%',
    )
    expect(production.rows.find((row) => row.label === 'Highest transaction')?.value).toBe(
      'materials — 25 Jul 2026',
    )
    expect(
      production.rows.find((row) => row.label === 'Highest transaction amount')?.value,
    ).toBe(300)
    expect(production.rows.find((row) => row.label === 'Period COGS (products sold)')?.value).toBe(
      375,
    )
    expect(production.categories).toEqual([
      { name: 'Materials', amount: 300, percent: 100 },
    ])
    expect(production.detailsHref).toContain('costType=PRODUCTION')
    expect(production.detailsHref).toContain('preset=month')
  })

  it('fails validation when highest transaction exceeds operating total', () => {
    const result = validateOperatingExpenseKpi({
      total: 175,
      transactionCount: 3,
      highestTransactionAmount: 300,
      categories: [
        { name: 'Materials', amount: 300, percent: 171.43 },
        { name: 'Customer Delivery', amount: 100, percent: 57.14 },
        { name: 'Salary', amount: 75, percent: 42.86 },
      ],
    })
    expect(result.ok).toBe(false)
    expect(result.messages.some((message) => message.includes('exceeds'))).toBe(true)
  })
})
