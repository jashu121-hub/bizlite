import { describe, expect, it } from 'vitest'

import { calculateSalesProfitability, lineCogsFromSnapshot } from '@/lib/services/sales-profitability'

describe('lineCogsFromSnapshot', () => {
  it('uses quantity × unitCost snapshot', () => {
    expect(
      lineCogsFromSnapshot({
        productName: 'T-Shirt',
        quantity: 15,
        unitCost: 20,
        lineTotal: 525,
      }).toNumber(),
    ).toBe(300)
  })

  it('falls back to lineCost only when unitCost snapshot is missing', () => {
    expect(
      lineCogsFromSnapshot({
        productName: 'Legacy',
        quantity: 2,
        lineTotal: 100,
        lineCost: 40,
      }).toNumber(),
    ).toBe(40)
  })

  it('does not invent a cost when no snapshot exists', () => {
    expect(
      lineCogsFromSnapshot({
        productName: 'Unknown',
        quantity: 5,
        lineTotal: 100,
      }).toNumber(),
    ).toBe(0)
  })
})

describe('calculateSalesProfitability', () => {
  it('matches P&L and product profitability for a single-product sale', () => {
    const result = calculateSalesProfitability([
      {
        totalAmount: 525,
        subtotal: 525,
        discount: 0,
        items: [
          {
            productId: 'p1',
            productName: 'T-Shirt',
            quantity: 15,
            unitCost: 20,
            lineTotal: 525,
            lineCost: 300,
          },
        ],
      },
    ])

    expect(result.salesRevenue).toBe(525)
    expect(result.productionCost).toBe(300)
    expect(result.grossProfit).toBe(225)
    expect(result.grossMargin).toBe(42.86)
    expect(result.productProfitability).toHaveLength(1)
    expect(result.productProfitability[0]).toMatchObject({
      productName: 'T-Shirt',
      quantitySold: 15,
      sales: 525,
      costOfGoodsSold: 300,
      grossProfit: 225,
      margin: 42.86,
    })
  })

  it('keeps P&L and product rows aligned when sale-time unit cost is 25', () => {
    const result = calculateSalesProfitability([
      {
        totalAmount: 525,
        items: [
          {
            productId: 'p1',
            productName: 'T-Shirt',
            quantity: 15,
            unitCost: 25,
            lineTotal: 525,
          },
        ],
      },
    ])

    expect(result.productionCost).toBe(375)
    expect(result.grossProfit).toBe(150)
    expect(result.grossMargin).toBe(28.57)
    expect(result.productProfitability[0].costOfGoodsSold).toBe(375)
    expect(result.productProfitability[0].grossProfit).toBe(150)
    expect(result.productProfitability[0].margin).toBe(28.57)
  })

  it('handles multiple products on one sale', () => {
    const result = calculateSalesProfitability([
      {
        totalAmount: 200,
        subtotal: 200,
        discount: 0,
        items: [
          {
            productId: 'a',
            productName: 'A',
            quantity: 2,
            unitCost: 10,
            lineTotal: 80,
          },
          {
            productId: 'b',
            productName: 'B',
            quantity: 4,
            unitCost: 15,
            lineTotal: 120,
          },
        ],
      },
    ])

    expect(result.productionCost).toBe(80) // 20 + 60
    expect(result.grossProfit).toBe(120)
    expect(result.productProfitability).toHaveLength(2)
    const byName = Object.fromEntries(
      result.productProfitability.map((row) => [row.productName, row]),
    )
    expect(byName.A.costOfGoodsSold).toBe(20)
    expect(byName.B.costOfGoodsSold).toBe(60)
  })

  it('ignores later catalog cost changes by using the sale-time snapshot', () => {
    const result = calculateSalesProfitability([
      {
        totalAmount: 100,
        items: [
          {
            productId: 'p1',
            productName: 'Widget',
            quantity: 2,
            unitCost: 20, // saved at sale
            lineTotal: 100,
            lineCost: 40,
          },
        ],
      },
    ])

    // Even if "current" product cost were 50, profitability stays on snapshot 20
    expect(result.productionCost).toBe(40)
    expect(result.productProfitability[0].costOfGoodsSold).toBe(40)
    expect(result.grossProfit).toBe(60)
  })

  it('allocates sale-level discount across product sales', () => {
    const result = calculateSalesProfitability([
      {
        totalAmount: 90,
        subtotal: 100,
        discount: 10,
        items: [
          {
            productId: 'p1',
            productName: 'A',
            quantity: 1,
            unitCost: 20,
            lineTotal: 60,
          },
          {
            productId: 'p2',
            productName: 'B',
            quantity: 1,
            unitCost: 10,
            lineTotal: 40,
          },
        ],
      },
    ])

    expect(result.salesRevenue).toBe(90)
    expect(result.productionCost).toBe(30)
    expect(result.grossProfit).toBe(60)
    const totalProductSales = result.productProfitability.reduce((sum, row) => sum + row.sales, 0)
    expect(totalProductSales).toBe(90)
    const byName = Object.fromEntries(
      result.productProfitability.map((row) => [row.productName, row]),
    )
    expect(byName.A.sales).toBe(54) // 60 - 6
    expect(byName.B.sales).toBe(36) // 40 - 4
  })

  it('reduces quantity, sales, and COGS for returned (negative) quantities', () => {
    const result = calculateSalesProfitability([
      {
        totalAmount: 350,
        subtotal: 350,
        discount: 0,
        items: [
          {
            productId: 'p1',
            productName: 'T-Shirt',
            quantity: 15,
            unitCost: 20,
            lineTotal: 525,
          },
          {
            productId: 'p1',
            productName: 'T-Shirt',
            quantity: -5,
            unitCost: 20,
            lineTotal: -175,
          },
        ],
      },
    ])

    expect(result.productProfitability[0].quantitySold).toBe(10)
    expect(result.productProfitability[0].sales).toBe(350)
    expect(result.productProfitability[0].costOfGoodsSold).toBe(200)
    expect(result.productionCost).toBe(200)
    expect(result.grossProfit).toBe(150)
  })

  it('excludes cancelled sales from revenue and COGS', () => {
    const result = calculateSalesProfitability([
      {
        status: 'CANCELLED',
        totalAmount: 525,
        items: [
          {
            productId: 'p1',
            productName: 'T-Shirt',
            quantity: 15,
            unitCost: 20,
            lineTotal: 525,
          },
        ],
      },
      {
        totalAmount: 100,
        items: [
          {
            productId: 'p2',
            productName: 'Cap',
            quantity: 2,
            unitCost: 10,
            lineTotal: 100,
          },
        ],
      },
    ])

    expect(result.salesRevenue).toBe(100)
    expect(result.productionCost).toBe(20)
    expect(result.productProfitability).toHaveLength(1)
    expect(result.productProfitability[0].productName).toBe('Cap')
  })

  it('returns zero margins (not NaN) when sales are zero', () => {
    const result = calculateSalesProfitability([])
    expect(result.salesRevenue).toBe(0)
    expect(result.productionCost).toBe(0)
    expect(result.grossProfit).toBe(0)
    expect(result.grossMargin).toBe(0)
    expect(result.netMargin).toBe(0)
    expect(Number.isFinite(result.grossMargin)).toBe(true)
    expect(result.productProfitability).toEqual([])
  })

  it('uses legacy lineCost fallback when unitCost snapshot is absent', () => {
    const result = calculateSalesProfitability([
      {
        totalAmount: 100,
        items: [
          {
            productId: 'legacy',
            productName: 'Old Item',
            quantity: 4,
            lineTotal: 100,
            lineCost: 48,
          },
        ],
      },
    ])

    expect(result.productionCost).toBe(48)
    expect(result.productProfitability[0].costOfGoodsSold).toBe(48)
    expect(result.grossProfit).toBe(52)
  })

  it('computes net profit after selling, overhead, and unclassified (incl. production expenses)', () => {
    const result = calculateSalesProfitability(
      [
        {
          totalAmount: 525,
          items: [
            {
              productId: 'p1',
              productName: 'T-Shirt',
              quantity: 15,
              unitCost: 20,
              lineTotal: 525,
            },
          ],
        },
      ],
      [
        { amount: 50, costType: 'SELLING' },
        { amount: 30, costType: 'OVERHEAD' },
        { amount: 20, costType: 'PRODUCTION' },
        { amount: 10, costType: null },
      ],
    )

    expect(result.grossProfit).toBe(225)
    expect(result.sellingCost).toBe(50)
    expect(result.profitAfterSellingCosts).toBe(175)
    expect(result.overheadCost).toBe(30)
    expect(result.productionExpenses).toBe(20)
    expect(result.unclassifiedExpenses).toBe(30) // 20 production + 10 null
    expect(result.netProfit).toBe(115) // 225 - 50 - 30 - 30
    expect(result.netMargin).toBe(21.9) // 115 / 525 × 100, rounded to 2 dp
  })
})
