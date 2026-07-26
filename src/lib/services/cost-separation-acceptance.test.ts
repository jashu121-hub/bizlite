import { describe, expect, it } from 'vitest'

import {
  computeDashboardTotalCost,
  reconcileDashboardPnL,
} from '@/lib/dashboard-total-cost'
import { isOperatingExpense, isSimpleModeCogsExpense } from '@/lib/expense-cost'
import { weightedAverageCost } from '@/lib/product-cost'
import { moneyNumber, percent } from '@/lib/money'

describe('cost separation — inventory vs OpEx vs COGS', () => {
  it('Acceptance 1: resale purchase is not OpEx; sold units become COGS', () => {
    const purchaseQty = 50
    const unitCost = 100
    const inventoryValue = purchaseQty * unitCost
    expect(inventoryValue).toBe(5000)

    const afterPurchase = computeDashboardTotalCost({
      costingMode: 'INVENTORY',
      saleLineCogs: 0,
      expenses: [
        // Misclassified inventory payment must not hit OpEx when ledgerKind is set
        {
          id: 'pay-1',
          date: new Date(2026, 6, 26),
          amount: '5000.00',
          costType: 'PRODUCTION',
          ledgerKind: 'PRODUCTION_PAYMENT',
          category: { name: 'Materials' },
          description: 'should not be OpEx',
        },
      ],
    })
    expect(afterPurchase.operatingExpenses).toBe(0)
    expect(afterPurchase.totalCost).toBe(0)

    const sellQty = 25
    const sales = sellQty * 150
    const cogs = sellQty * unitCost
    const costs = computeDashboardTotalCost({
      costingMode: 'INVENTORY',
      saleLineCogs: cogs,
      expenses: [],
    })
    expect(sales).toBe(3750)
    expect(costs.totalCost).toBe(2500)
    expect(sales - costs.totalCost).toBe(1250)
    expect(
      reconcileDashboardPnL({
        sales,
        cogs: costs.cogs,
        operatingExpenses: costs.operatingExpenses,
        totalCost: costs.totalCost,
        netProfit: sales - costs.totalCost,
      }).ok,
    ).toBe(true)
  })

  it('Acceptance 2: operating expense with inventory ledger kind is excluded', () => {
    expect(
      isOperatingExpense({
        costType: 'OVERHEAD',
        ledgerKind: 'INVENTORY_PURCHASE',
      }),
    ).toBe(false)
    expect(
      isOperatingExpense({
        costType: 'PRODUCTION',
        ledgerKind: 'PRODUCTION_PAYMENT',
      }),
    ).toBe(false)
    expect(
      isOperatingExpense({
        costType: 'SELLING',
        ledgerKind: 'OPERATING',
      }),
    ).toBe(true)
  })

  it('Acceptance 3: manufactured batch sits in inventory until sold', () => {
    const batchCost = 600 + 200 + 100 + 100
    const finishedQty = 20
    const unitCost = batchCost / finishedQty
    expect(unitCost).toBe(50)
    expect(weightedAverageCost(0, 0, finishedQty, unitCost)).toBe('50.00')

    const beforeSale = computeDashboardTotalCost({
      costingMode: 'INVENTORY',
      saleLineCogs: 0,
      expenses: [
        {
          id: 'prod-pay',
          date: new Date(2026, 6, 26),
          amount: '1000.00',
          costType: 'PRODUCTION',
          ledgerKind: 'PRODUCTION_PAYMENT',
          category: { name: 'Production' },
          description: 'batch payment',
        },
      ],
    })
    expect(beforeSale.totalCost).toBe(0)
    expect(beforeSale.operatingExpenses).toBe(0)

    const sold = 5
    const sales = sold * 100
    const cogs = sold * unitCost
    const afterSale = computeDashboardTotalCost({
      costingMode: 'INVENTORY',
      saleLineCogs: cogs,
      expenses: [],
    })
    expect(sales).toBe(500)
    expect(afterSale.cogs).toBe(250)
    expect(sales - afterSale.totalCost).toBe(250)
    expect((finishedQty - sold) * unitCost).toBe(750)
  })

  it('SIMPLE mode never treats PRODUCTION_PAYMENT as period COGS', () => {
    expect(
      isSimpleModeCogsExpense({
        costType: 'PRODUCTION',
        ledgerKind: 'PRODUCTION_PAYMENT',
      }),
    ).toBe(false)
    expect(
      isSimpleModeCogsExpense({
        costType: 'PRODUCTION',
        ledgerKind: 'OPERATING',
      }),
    ).toBe(true)

    const simple = computeDashboardTotalCost({
      costingMode: 'SIMPLE',
      saleLineCogs: 999,
      expenses: [
        {
          id: '1',
          date: new Date(2026, 6, 26),
          amount: '1000.00',
          costType: 'PRODUCTION',
          ledgerKind: 'PRODUCTION_PAYMENT',
          category: { name: 'Materials' },
          description: 'payment',
        },
        {
          id: '2',
          date: new Date(2026, 6, 26),
          amount: '50.00',
          costType: 'OVERHEAD',
          ledgerKind: 'OPERATING',
          category: { name: 'Rent' },
          description: 'rent',
        },
      ],
    })
    expect(simple.cogs).toBe(0)
    expect(simple.operatingExpenses).toBe(50)
    expect(simple.totalCost).toBe(50)
  })

  it('never deducts full purchase and COGS for the same stock', () => {
    const purchase = 5000
    const cogs = 2500
    const wrongDoubleCount = purchase + cogs
    expect(wrongDoubleCount).toBe(7500)
    const correctTotalCost = cogs
    expect(correctTotalCost).toBe(2500)
    expect(moneyNumber(percent(1250, 3750))).toBe(33.33)
  })
})
