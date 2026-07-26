import { describe, expect, it } from 'vitest'

import {
  computeDashboardTotalCost,
  reconcileDashboardPnL,
} from '@/lib/dashboard-total-cost'

describe('computeDashboardTotalCost', () => {
  it('INVENTORY: Total Cost = sale-line COGS + operating expenses (excludes PRODUCTION ledger)', () => {
    const result = computeDashboardTotalCost({
      costingMode: 'INVENTORY',
      saleLineCogs: 500,
      expenses: [
        {
          id: '1',
          date: new Date(2026, 6, 25),
          amount: '300.00',
          costType: 'PRODUCTION',
          category: { name: 'Materials' },
          description: 'materials purchase',
        },
        {
          id: '2',
          date: new Date(2026, 6, 25),
          amount: '25.00',
          costType: 'SELLING',
          category: { name: 'Customer Delivery' },
          description: 'delivery',
        },
      ],
    })

    // PRODUCTION 300 is NOT added again — already reflected in sale-line COGS when sold
    expect(result.cogs).toBe(500)
    expect(result.operatingExpenses).toBe(25)
    expect(result.totalCost).toBe(525)
    expect(result.productionExpenseLedger).toBe(300)
    expect(result.byCategory.map((r) => r.name)).toContain('COGS / Product Cost')
    expect(result.byCategory.find((r) => r.name === 'COGS / Product Cost')?.amount).toBe(500)
    expect(result.byCostType.find((r) => r.key === 'COGS')?.amount).toBe(500)
    expect(result.byCostType.find((r) => r.key === 'OPERATING')?.amount).toBe(25)
    expect(result.validation.ok).toBe(true)
  })

  it('INVENTORY: shows COGS when there are no expense entries', () => {
    const result = computeDashboardTotalCost({
      costingMode: 'INVENTORY',
      saleLineCogs: 500,
      expenses: [],
    })
    expect(result.totalCost).toBe(500)
    expect(result.byCategory).toEqual([
      expect.objectContaining({ name: 'COGS / Product Cost', amount: 500 }),
    ])
    expect(result.byCategory.length).toBeGreaterThan(0)
  })

  it('matches Sales 700 / COGS 500 / OpEx 0 → Total Cost 500, Net 200', () => {
    const costs = computeDashboardTotalCost({
      costingMode: 'INVENTORY',
      saleLineCogs: 500,
      expenses: [],
    })
    const sales = 700
    const netProfit = sales - costs.totalCost
    expect(costs.totalCost).toBe(500)
    expect(netProfit).toBe(200)
    const check = reconcileDashboardPnL({
      sales,
      cogs: costs.cogs,
      operatingExpenses: costs.operatingExpenses,
      totalCost: costs.totalCost,
      netProfit,
      dateRangeLabel: 'July 2026',
    })
    expect(check.ok).toBe(true)
  })

  it('SIMPLE: COGS = PRODUCTION expenses + operating', () => {
    const result = computeDashboardTotalCost({
      costingMode: 'SIMPLE',
      saleLineCogs: 999, // ignored in SIMPLE
      expenses: [
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
    })

    expect(result.cogs).toBe(300)
    expect(result.operatingExpenses).toBe(175)
    expect(result.totalCost).toBe(475)
    expect(result.byCategory.some((r) => r.name.startsWith('COGS ·'))).toBe(true)
    expect(result.validation.ok).toBe(true)
  })

  it('does not double-count duplicate expense ids', () => {
    const row = {
      id: '1',
      date: new Date(2026, 6, 25),
      amount: '25.00' as const,
      costType: 'OVERHEAD' as const,
      category: { name: 'Salary' },
      description: 'wages',
    }
    const result = computeDashboardTotalCost({
      costingMode: 'INVENTORY',
      saleLineCogs: 100,
      expenses: [row, row],
    })
    expect(result.operatingExpenses).toBe(25)
    expect(result.totalCost).toBe(125)
  })
})
