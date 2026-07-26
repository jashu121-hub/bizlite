import { describe, expect, it } from 'vitest'
import {
  allocateOverhead,
  computeCostPricing,
  computeLineDetail,
  lineTotal,
  sellingPriceFromMode,
} from '@/lib/cost-pricing/compute'
import { createDefaultPayload, createEmptyCostLine } from '@/lib/cost-pricing/defaults'
import { convertQuantity } from '@/lib/cost-pricing/units'

describe('cost pricing compute', () => {
  it('computes line total from qty × unit cost', () => {
    const line = createEmptyCostLine('Materials', 'Fabric', 'qtyUnit')
    line.quantity = '5'
    line.unit = 'm'
    line.unitCost = '10'
    expect(lineTotal(line)).toBe(50)
  })

  it('supports fixed batch cost without dividing in the row', () => {
    const line = createEmptyCostLine('Direct Labour', 'Direct labour', 'fixedBatch')
    line.fixedTotal = '150'
    expect(lineTotal(line)).toBe(150)
  })

  it('includes only bulk usage consumed, not unused purchase value', () => {
    const line = createEmptyCostLine('Materials', 'Fabric', 'bulkUsage')
    line.bulkPurchaseQty = '100'
    line.bulkPurchaseUnit = 'm'
    line.bulkPurchaseAmount = '1000'
    line.quantityUsed = '30'
    line.usageUnit = 'm'
    const detail = computeLineDetail(line)
    expect(detail.bulkUnitCost).toBe(10)
    expect(detail.total).toBe(300)
    expect(detail.remainingQty).toBe(70)
    expect(detail.remainingValue).toBe(700)
  })

  it('converts kg purchase to grams used', () => {
    const line = createEmptyCostLine('Materials', 'Fill', 'bulkUsage')
    line.bulkPurchaseQty = '10'
    line.bulkPurchaseUnit = 'kg'
    line.bulkPurchaseAmount = '200'
    line.quantityUsed = '500'
    line.usageUnit = 'g'
    const detail = computeLineDetail(line)
    expect(detail.total).toBe(10)
    expect(detail.bulkUnitCost).toBe(0.02)
    expect(convertQuantity(10, 'kg', 'g')).toBe(10000)
  })

  it('matches the T-shirt batch example with finished quantity', () => {
    const payload = createDefaultPayload({
      quantity: 15,
      lines: [
        {
          ...createEmptyCostLine('Materials', 'Materials', 'fixedBatch'),
          fixedTotal: '300',
        },
        {
          ...createEmptyCostLine('Direct Labour', 'Direct labour', 'fixedBatch'),
          fixedTotal: '45',
        },
        {
          ...createEmptyCostLine('Packaging', 'Packaging', 'fixedBatch'),
          fixedTotal: '15',
        },
        {
          ...createEmptyCostLine('Production Transportation', 'Transportation', 'fixedBatch'),
          fixedTotal: '15',
        },
      ],
      pricingMode: 'markup',
      targetMarkupPct: '40',
    })
    const t = computeCostPricing(payload)
    expect(t.totalBatchCost).toBe(375)
    expect(t.costPerUnit).toBe(25)
    expect(t.suggestedSellingPrice).toBe(35)
  })

  it('validates AED 54 batch across finished quantities', () => {
    const lines = [
      { ...createEmptyCostLine('Materials', 'Materials', 'fixedBatch'), fixedTotal: '35' },
      { ...createEmptyCostLine('Direct Labour', 'Labour', 'fixedBatch'), fixedTotal: '15' },
      { ...createEmptyCostLine('Packaging', 'Packaging', 'fixedBatch'), fixedTotal: '3' },
      {
        ...createEmptyCostLine('Production Transportation', 'Transport', 'fixedBatch'),
        fixedTotal: '1',
      },
    ]
    expect(computeCostPricing(createDefaultPayload({ quantity: 1, lines })).costPerUnit).toBe(54)
    expect(computeCostPricing(createDefaultPayload({ quantity: 10, lines })).costPerUnit).toBe(5.4)
    expect(computeCostPricing(createDefaultPayload({ quantity: 15, lines })).costPerUnit).toBe(3.6)
  })

  it('absorbs finished-product wastage into saleable unit cost', () => {
    const payload = createDefaultPayload({
      quantity: 18,
      wastageMode: 'finishedQty',
      finishedWastageQty: '2',
      lines: [
        { ...createEmptyCostLine('Materials', 'Materials', 'fixedBatch'), fixedTotal: '360' },
      ],
    })
    const t = computeCostPricing(payload)
    expect(t.manufacturedQuantity).toBe(20)
    expect(t.totalBatchCost).toBe(360)
    expect(t.costPerUnit).toBe(20) // 360 ÷ 18 saleable
  })

  it('rejects usage above bulk quantity', () => {
    const payload = createDefaultPayload({
      quantity: 1,
      lines: [
        {
          ...createEmptyCostLine('Materials', 'Fabric', 'bulkUsage'),
          bulkPurchaseQty: '10',
          bulkPurchaseUnit: 'm',
          bulkPurchaseAmount: '100',
          quantityUsed: '12',
          usageUnit: 'm',
        },
      ],
    })
    expect(computeCostPricing(payload).validation.ok).toBe(false)
  })

  it('computes margin pricing differently from markup', () => {
    const price = sellingPriceFromMode('margin', 25, 40, 40, 0)
    expect(price).toBe(41.67)
  })

  it('handles zero finished quantity safely', () => {
    const payload = createDefaultPayload({ quantity: 0 })
    const t = computeCostPricing(payload)
    expect(t.costPerUnit).toBe(0)
    expect(Number.isFinite(t.costPerUnit)).toBe(true)
    expect(t.validation.ok).toBe(false)
  })

  it('allocates overhead by method', () => {
    expect(allocateOverhead('fixed', 50, 375, 15)).toBe(50)
    expect(allocateOverhead('perUnit', 2, 375, 15)).toBe(30)
    expect(allocateOverhead('percent', 10, 375, 15)).toBe(37.5)
  })
})
