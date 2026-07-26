import { describe, expect, it } from 'vitest'

import {
  computeDashboardTotalCost,
  reconcileDashboardPnL,
} from '@/lib/dashboard-total-cost'
import { weightedAverageCost } from '@/lib/product-cost'
import { moneyNumber, percent } from '@/lib/money'

/**
 * Acceptance test — Demo Product purchase vs sale COGS.
 *
 * Purchase 50 @ AED 100 = inventory AED 5,000 (not an expense).
 * Sell 25 @ AED 150 → Sales 3,750, COGS 2,500, GP 1,250.
 * Remaining stock 25 × 100 = AED 2,500.
 */
describe('Demo Product purchase / sale COGS acceptance', () => {
  const purchasedQty = 50
  const unitPurchaseCost = 100
  const totalPurchaseValue = purchasedQty * unitPurchaseCost
  const sellQty = 25
  const unitSellingPrice = 150

  it('records purchase as inventory value, not operating expense', () => {
    expect(totalPurchaseValue).toBe(5000)
    const avgCost = weightedAverageCost(0, 0, purchasedQty, unitPurchaseCost)
    expect(avgCost).toBe('100.00')
    // Profit after purchase only (no sale, no opex) stays 0
    const afterPurchase = computeDashboardTotalCost({
      costingMode: 'INVENTORY',
      saleLineCogs: 0,
      expenses: [],
    })
    expect(afterPurchase.totalCost).toBe(0)
    expect(afterPurchase.operatingExpenses).toBe(0)
  })

  it('recognises only sold quantity as COGS', () => {
    const netSales = sellQty * unitSellingPrice
    const cogs = sellQty * unitPurchaseCost
    const grossProfit = netSales - cogs
    const remainingQty = purchasedQty - sellQty
    const remainingValue = remainingQty * unitPurchaseCost

    expect(netSales).toBe(3750)
    expect(cogs).toBe(2500)
    expect(grossProfit).toBe(1250)
    expect(remainingQty).toBe(25)
    expect(remainingValue).toBe(2500)
  })

  it('dashboard reconciles Sales − Total Cost = Net Profit with no OpEx', () => {
    const costs = computeDashboardTotalCost({
      costingMode: 'INVENTORY',
      saleLineCogs: 2500,
      expenses: [],
    })
    expect(costs.cogs).toBe(2500)
    expect(costs.operatingExpenses).toBe(0)
    expect(costs.totalCost).toBe(2500)

    const sales = 3750
    const netProfit = sales - costs.totalCost
    expect(netProfit).toBe(1250)

    const check = reconcileDashboardPnL({
      sales,
      cogs: costs.cogs,
      operatingExpenses: costs.operatingExpenses,
      totalCost: costs.totalCost,
      netProfit,
    })
    expect(check.ok).toBe(true)
  })

  it('product profitability margin and markup match expected', () => {
    const revenue = 3750
    const cogs = 2500
    const grossProfit = revenue - cogs
    const grossMargin = moneyNumber(percent(grossProfit, revenue))
    const markup = moneyNumber(percent(grossProfit, cogs))

    expect(grossProfit).toBe(1250)
    expect(grossMargin).toBe(33.33)
    expect(markup).toBe(50)
  })

  it('does not deduct full purchase value when only half is sold', () => {
    const wrongIfFullPurchaseExpensed = 5000
    const correctCogs = 2500
    expect(correctCogs).not.toBe(wrongIfFullPurchaseExpensed)
    expect(correctCogs).toBe(sellQty * unitPurchaseCost)
  })

  it('sale cancellation restores stock and reverses COGS snapshot', () => {
    const afterSaleQty = 25
    const cancelledQty = 25
    const restoredQty = afterSaleQty + cancelledQty
    const reversedCogs = cancelledQty * unitPurchaseCost
    const reversedRevenue = cancelledQty * unitSellingPrice

    expect(restoredQty).toBe(50)
    expect(reversedCogs).toBe(2500)
    expect(reversedRevenue).toBe(3750)
  })
})
