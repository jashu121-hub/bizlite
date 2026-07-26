import { describe, expect, it } from 'vitest'

import { explainUnitCostFromBreakdown } from '@/lib/cogs-reconciliation'

describe('explainUnitCostFromBreakdown', () => {
  it('explains AED 25 unit cost from production components for 15 units sold', () => {
    const result = explainUnitCostFromBreakdown(
      {
        productionQuantity: 15,
        materials: '250.00',
        stitching: '100.00',
        design: '0',
        packaging: '0',
        inwardTransport: '10.00',
        customs: '0',
        otherProduction: '15.00',
        customProductionCosts: [],
        marketing: '0',
        commission: '0',
        outwardDelivery: '0',
        marketplaceFees: '0',
        otherSelling: '5.00',
        totalProductionCost: '375.00',
        inventoryCostPerUnit: '25.00',
        totalSellingCost: '5.00',
        sellingCostPerUnit: '0.33',
        fullCostPerUnit: '25.33',
      },
      15,
      25,
    )

    expect(result.componentsExplainUnitCost).toBe(true)
    expect(result.inventoryCostPerUnitFromBreakdown).toBe(25)
    expect(result.totalProductionBatchCost).toBe(375)
    expect(result.components.map((c) => c.key)).toEqual([
      'materials',
      'stitching',
      'inwardTransport',
      'otherProduction',
    ])
    expect(result.components.find((c) => c.key === 'materials')?.soldAmount).toBe(250)
    expect(result.components.find((c) => c.key === 'stitching')?.soldAmount).toBe(100)
    expect(result.components.reduce((sum, c) => sum + c.soldAmount, 0)).toBe(375)
    // Per-unit display may round to 25.01 when summing rounded component rates;
    // inventoryCostPerUnit from the calculator is the authoritative unit cost.
    expect(result.inventoryCostPerUnitFromBreakdown).toBe(25)
  })
})
