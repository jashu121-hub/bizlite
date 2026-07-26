import { describe, expect, it } from 'vitest'

import { buildKpiSummaries } from '@/lib/queries/kpi-summaries'
import type { PeriodComparison } from '@/lib/dashboard-date-range'

const neutralTrend: PeriodComparison = {
  percent: null,
  label: 'No previous period',
  favourable: null,
}

describe('total cost KPI summary', () => {
  it('builds a combined Total Cost popup from all cost entries', () => {
    const summary = buildKpiSummaries({
      todaySalesRows: [],
      periodSalesRows: [],
      totalCostExpenseRows: [
        {
          id: '1',
          date: new Date(2026, 6, 25),
          amount: '300.00',
          costType: 'PRODUCTION',
          category: { name: 'Materials' },
          description: 'materials',
        },
        {
          id: '2',
          date: new Date(2026, 6, 25),
          amount: '100.00',
          costType: 'SELLING',
          category: { name: 'Customer Delivery' },
          description: 'Transportation',
        },
        {
          id: '3',
          date: new Date(2026, 6, 20),
          amount: '75.00',
          costType: 'OVERHEAD',
          category: { name: 'Salary' },
          description: 'Wages',
        },
      ],
      operatingExpenseTotal: 175,
      pendingSalesAll: [],
      products: [],
      cards: {
        todaySales: 0,
        monthSales: 700,
        totalCost: 475,
        netProfit: 150,
        pendingPayments: 0,
        stockValue: 0,
        lowStockCount: 0,
        periodPaid: 700,
        periodPending: 0,
        periodInvoiceCount: 1,
        trends: {
          todaySales: neutralTrend,
          monthSales: neutralTrend,
          totalCost: neutralTrend,
          netProfit: neutralTrend,
        },
      },
      periodSalesTotal: 700,
      periodLabel: 'July 2026',
      firstCardTitle: "Today's Sales",
      firstCardRangeLabel: '25 Jul 2026',
      salesTitle: 'This Month Sales',
      totalCostTitle: 'This Month Total Cost',
      isTodayFirstCard: true,
      periodType: 'month',
      year: 2026,
      month: 7,
    }).totalCost

    expect(summary.title).toBe('This Month Total Cost')
    expect(summary.primaryValue).toBe(475)
    expect(summary.rows.find((row) => row.label === 'Total entries')?.value).toBe(3)
    expect(summary.rows.find((row) => row.label === 'Highest category')?.value).toBe(
      'Materials — 63.16%',
    )
    expect(summary.rows.find((row) => row.label === 'Highest transaction')?.value).toBe(
      'materials — 25 Jul 2026',
    )
    expect(summary.rows.find((row) => row.label === 'Highest transaction amount')?.value).toBe(
      300,
    )
    expect(summary.sections?.map((section) => section.id)).toEqual([
      'by-cost-type',
      'by-category',
      'recent-entries',
    ])
    const byType = summary.sections?.find((section) => section.id === 'by-cost-type')?.categories
    expect(byType?.find((row) => row.name === 'Production Cost')?.amount).toBe(300)
    expect(byType?.find((row) => row.name === 'Selling Cost')?.percent).toBeCloseTo(21.05, 2)
    const recent = summary.sections?.find((section) => section.id === 'recent-entries')?.listItems
    expect(recent?.[0]?.primary).toBe('materials')
    expect(recent?.[0]?.secondary).toContain('Production Cost')
    expect(summary.detailsHref).toContain('/expenses?preset=month')
    expect(summary.detailsHref).not.toContain('costType=')
  })
})
