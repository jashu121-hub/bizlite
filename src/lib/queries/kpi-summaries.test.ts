import { describe, expect, it } from 'vitest'

import { computeDashboardTotalCost } from '@/lib/dashboard-total-cost'
import { buildKpiSummaries } from '@/lib/queries/kpi-summaries'
import type { PeriodComparison } from '@/lib/dashboard-date-range'

const neutralTrend: PeriodComparison = {
  percent: null,
  label: 'No previous period',
  favourable: null,
}

describe('total cost KPI summary', () => {
  it('shows COGS + operating expenses from the shared Total Cost service', () => {
    // Pure COGS case: Sales 700, COGS 500, OpEx 0
    const costs = computeDashboardTotalCost({
      costingMode: 'INVENTORY',
      saleLineCogs: 500,
      expenses: [],
    })

    const summary = buildKpiSummaries({
      todaySalesRows: [],
      periodSalesRows: [],
      totalCostBreakdown: costs,
      pendingSalesAll: [],
      products: [],
      cards: {
        todaySales: 0,
        monthSales: 700,
        totalCost: costs.totalCost,
        netProfit: 200,
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
    expect(summary.primaryValue).toBe(500)
    expect(summary.rows.find((row) => row.label === 'COGS / Product Cost')?.value).toBe(500)
    expect(summary.rows.find((row) => row.label === 'Operating Expenses')?.value).toBe(0)
    expect(summary.rows.find((row) => row.label === 'Total Cost')?.value).toBe(500)
    expect(summary.sections?.map((section) => section.id)).toEqual([
      'cost-breakdown',
      'by-category',
      'recent-entries',
    ])
    const byType = summary.sections?.find((section) => section.id === 'cost-breakdown')?.categories
    expect(byType?.find((row) => row.name === 'COGS / Product Cost')?.amount).toBe(500)
    expect(byType?.find((row) => row.name === 'Operating Expenses')?.amount).toBe(0)
    expect(summary.detailsHref).toContain('/reports?')
  })

  it('net profit popup includes COGS so Sales − Total Cost reconciles', () => {
    const costs = computeDashboardTotalCost({
      costingMode: 'INVENTORY',
      saleLineCogs: 500,
      expenses: [],
    })
    const net = buildKpiSummaries({
      todaySalesRows: [],
      periodSalesRows: [],
      totalCostBreakdown: costs,
      pendingSalesAll: [],
      products: [],
      cards: {
        todaySales: 0,
        monthSales: 700,
        totalCost: 500,
        netProfit: 200,
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
    }).netProfit

    expect(net.rows.find((r) => r.label === 'Total sales')?.value).toBe(700)
    expect(net.rows.find((r) => r.label === 'COGS / Product Cost')?.value).toBe(500)
    expect(net.rows.find((r) => r.label === 'Total Cost')?.value).toBe(500)
    expect(net.rows.find((r) => r.label === 'Net profit')?.value).toBe(200)
  })
})
