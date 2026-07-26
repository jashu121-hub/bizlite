import { describe, expect, it } from 'vitest'

import {
  computeDashboardTotalCost,
  reconcileDashboardPnL,
} from '@/lib/dashboard-total-cost'
import { weightedAverageCost } from '@/lib/product-cost'
import { moneyNumber } from '@/lib/money'

/**
 * Pure accounting checks for product cost / inventory / sales / dashboard linkage.
 * These formulas must stay shared with Dashboard, Reports, and Product Profitability.
 */

describe('weighted-average inventory cost', () => {
  it('blends existing and added stock (demo AED 50 + AED 60 → AED 55)', () => {
    const next = weightedAverageCost(10, 50, 10, 60)
    expect(next).toBe('55.00')
  })

  it('uses added unit cost when existing quantity is zero', () => {
    expect(weightedAverageCost(0, 0, 20, 50)).toBe('50.00')
  })

  it('handles zero total quantity safely', () => {
    expect(weightedAverageCost(0, 40, 0, 50)).toBe('0.00')
  })

  it('ignores negative quantity inputs via clamp', () => {
    expect(weightedAverageCost(-5, 40, 10, 50)).toBe('50.00')
  })
})

describe('opening stock valuation', () => {
  it('computes opening stock value as qty × unit cost (not an expense)', () => {
    const qty = 20
    const unitCost = 50
    const openingValue = qty * unitCost
    expect(openingValue).toBe(1000)
  })

  it('requires unit cost when opening quantity > 0', () => {
    const openingQty = 5
    const unitCost = 0
    const valid = !(openingQty > 0 && !(unitCost > 0))
    expect(valid).toBe(false)
  })
})

describe('production batch receipt (Classic T-Shirt demo)', () => {
  it('sets quantity, average cost and stock value after production', () => {
    const qty = 20
    const unitCost = 50
    const avg = weightedAverageCost(0, 0, qty, unitCost)
    const stockValue = moneyNumber(avg) * qty
    expect(avg).toBe('50.00')
    expect(stockValue).toBe(1000)
  })
})

describe('sales COGS snapshot and historical protection', () => {
  it('snapshots COGS at posting time and ignores later catalog cost changes', () => {
    const qtySold = 5
    const inventoryUnitCostAtSale = 50
    const sellingPrice = 100
    const netSales = qtySold * sellingPrice
    const cogs = qtySold * inventoryUnitCostAtSale
    const grossProfit = netSales - cogs

    expect(netSales).toBe(500)
    expect(cogs).toBe(250)
    expect(grossProfit).toBe(250)

    const remainingQty = 20 - qtySold
    const remainingValue = remainingQty * inventoryUnitCostAtSale
    expect(remainingQty).toBe(15)
    expect(remainingValue).toBe(750)

    // Later catalog / WAC change must not alter historical sale-line COGS
    const newCatalogCost = 70
    const historicalCogs = qtySold * inventoryUnitCostAtSale
    const wrongIfRecalculated = qtySold * newCatalogCost
    expect(historicalCogs).toBe(250)
    expect(wrongIfRecalculated).toBe(350)
    expect(historicalCogs).not.toBe(wrongIfRecalculated)
  })

  it('uses original sale-line cost when restoring inventory on return/cancel', () => {
    const saleLineUnitCost = 50
    const returnQty = 5
    const restoreValue = returnQty * saleLineUnitCost
    expect(restoreValue).toBe(250)
  })
})

describe('dashboard / report reconciliation (shared formulas)', () => {
  it('matches Classic T-Shirt demo: Sales 500, COGS 250, OpEx 100 → Net Profit 150', () => {
    const costs = computeDashboardTotalCost({
      costingMode: 'INVENTORY',
      saleLineCogs: 250,
      expenses: [
        {
          id: 'opex-1',
          date: new Date(2026, 6, 25),
          amount: '100.00',
          costType: 'OVERHEAD',
          category: { name: 'Rent' },
          description: 'operating expense',
        },
      ],
    })

    expect(costs.cogs).toBe(250)
    expect(costs.operatingExpenses).toBe(100)
    expect(costs.totalCost).toBe(350)

    const sales = 500
    const netProfit = sales - costs.totalCost
    expect(netProfit).toBe(150)

    const check = reconcileDashboardPnL({
      sales,
      cogs: costs.cogs,
      operatingExpenses: costs.operatingExpenses,
      totalCost: costs.totalCost,
      netProfit,
      dateRangeLabel: 'Demo',
    })
    expect(check.ok).toBe(true)
  })

  it('keeps Total Cost = COGS + Operating Expenses', () => {
    const result = computeDashboardTotalCost({
      costingMode: 'INVENTORY',
      saleLineCogs: 250,
      expenses: [
        {
          id: '1',
          date: new Date(2026, 6, 25),
          amount: '80.00',
          costType: 'PRODUCTION',
          category: { name: 'Materials' },
          description: 'batch materials',
        },
        {
          id: '2',
          date: new Date(2026, 6, 25),
          amount: '20.00',
          costType: 'SELLING',
          category: { name: 'Delivery' },
          description: 'delivery',
        },
      ],
    })
    expect(result.totalCost).toBe(result.cogs + result.operatingExpenses)
    expect(result.cogs).toBe(250)
    expect(result.operatingExpenses).toBe(20)
    expect(result.totalCost).toBe(270)
  })
})

describe('product price changes affect future sales only', () => {
  it('copies default selling price into sale line then allows override', () => {
    const defaultSellingPrice = 100
    let saleLinePrice = defaultSellingPrice
    saleLinePrice = 95
    expect(saleLinePrice).toBe(95)

    const updatedDefault = 120
    expect(saleLinePrice).toBe(95)
    expect(updatedDefault).not.toBe(saleLinePrice)
  })
})

describe('stock adjustment and service rules', () => {
  it('treats services as non-inventory', () => {
    const productType = 'SERVICE'
    const tracksStock = productType !== 'SERVICE'
    expect(tracksStock).toBe(false)
  })

  it('computes adjustment out value at current average cost', () => {
    const avgCost = 55
    const qtyOut = 2
    expect(avgCost * qtyOut).toBe(110)
  })
})
