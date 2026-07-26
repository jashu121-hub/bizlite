import { describe, expect, it } from 'vitest'

import { computeDashboardTotalCost } from '@/lib/dashboard-total-cost'

describe('computeDashboardTotalCost', () => {
  it('sums production and operating costs with shared percentage denominator', () => {
    const result = computeDashboardTotalCost([
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
    ])

    expect(result.totalCost).toBe(475)
    expect(result.entryCount).toBe(3)
    expect(result.productionCost).toBe(300)
    expect(result.sellingCost).toBe(100)
    expect(result.overheadCost).toBe(75)
    expect(result.unclassifiedExpenses).toBe(0)
    expect(result.byCostType.find((row) => row.key === 'PRODUCTION')?.percent).toBeCloseTo(63.16, 2)
    expect(result.byCostType.find((row) => row.key === 'SELLING')?.percent).toBeCloseTo(21.05, 2)
    expect(result.byCostType.find((row) => row.key === 'OVERHEAD')?.percent).toBeCloseTo(15.79, 2)
    expect(result.byCategory.map((row) => row.name)).toEqual([
      'Materials',
      'Customer Delivery',
      'Salary',
    ])
    expect(result.byCategory.reduce((sum, row) => sum + row.percent, 0)).toBeCloseTo(100, 1)
    expect(result.highestCategory?.name).toBe('Materials')
    expect(result.highestTransaction?.description).toBe('materials')
    expect(result.validation.ok).toBe(true)
  })

  it('does not double-count duplicate expense ids', () => {
    const row = {
      id: '1',
      date: new Date(2026, 6, 25),
      amount: '300.00' as const,
      costType: 'PRODUCTION' as const,
      category: { name: 'Materials' },
      description: 'materials',
    }
    const result = computeDashboardTotalCost([row, row])
    expect(result.totalCost).toBe(300)
    expect(result.entryCount).toBe(1)
  })
})
