import { describe, expect, it } from 'vitest'
import {
  allocateOverhead,
  computeCostPricing,
  computeLineDetail,
  lineTotal,
  sellingPriceFromMode,
} from '@/lib/cost-pricing/compute'
import { createDefaultPayload, createEmptyCostLine } from '@/lib/cost-pricing/defaults'

describe('cost pricing compute', () => {
  it('computes quantity × rate', () => {
    const line = createEmptyCostLine('Materials', 'Fabric', 'qtyUnit')
    line.quantity = '5'
    line.unitCost = '10'
    expect(lineTotal(line)).toBe(50)
  })

  it('computes labour hours × rate', () => {
    const line = createEmptyCostLine('Direct Labour', 'Stitching', 'labourHours')
    line.quantity = '3'
    line.unitCost = '25'
    expect(lineTotal(line)).toBe(75)
  })

  it('computes cost per finished unit × saleable qty', () => {
    const line = createEmptyCostLine('Packaging', 'Labels', 'perFinishedUnit')
    line.unitCost = '2'
    expect(lineTotal(line, 15)).toBe(30)
  })

  it('supports fixed batch amount', () => {
    const line = createEmptyCostLine('Direct Labour', 'Direct labour', 'fixedBatch')
    line.fixedTotal = '150'
    expect(lineTotal(line)).toBe(150)
  })

  it('includes only bulk usage consumed', () => {
    const line = createEmptyCostLine('Materials', 'Fabric', 'bulkUsage')
    line.bulkPurchaseQty = '100'
    line.bulkPurchaseUnit = 'm'
    line.bulkPurchaseAmount = '1000'
    line.quantityUsed = '30'
    line.usageUnit = 'm'
    const detail = computeLineDetail(line)
    expect(detail.total).toBe(300)
    expect(detail.remainingValue).toBe(700)
  })

  it('validates AED 54 batch across finished quantities', () => {
    const lines = [
      { ...createEmptyCostLine('Materials', 'Materials', 'fixedBatch'), fixedTotal: '35' },
      { ...createEmptyCostLine('Direct Labour', 'Labour', 'fixedBatch'), fixedTotal: '15' },
      { ...createEmptyCostLine('Packaging', 'Packaging', 'fixedBatch'), fixedTotal: '3' },
      {
        ...createEmptyCostLine('Transportation', 'Transport', 'fixedBatch'),
        fixedTotal: '1',
      },
    ]
    expect(computeCostPricing(createDefaultPayload({ quantity: 1, lines })).costPerUnit).toBe(54)
    expect(computeCostPricing(createDefaultPayload({ quantity: 10, lines })).costPerUnit).toBe(5.4)
    expect(computeCostPricing(createDefaultPayload({ quantity: 15, lines })).costPerUnit).toBe(3.6)
  })

  it('reduces saleable qty by finished wastage and applies material wastage to materials only', () => {
    const payload = createDefaultPayload({
      quantity: 20,
      finishedWastageQty: '2',
      wastagePct: '10',
      lines: [
        { ...createEmptyCostLine('Materials', 'Materials', 'fixedBatch'), fixedTotal: '100' },
        { ...createEmptyCostLine('Direct Labour', 'Labour', 'fixedBatch'), fixedTotal: '80' },
      ],
    })
    const t = computeCostPricing(payload)
    expect(t.quantity).toBe(18)
    expect(t.manufacturedQuantity).toBe(20)
    expect(t.wastageCost).toBe(10) // 10% of materials 100 only
    expect(t.totalBatchCost).toBe(190)
    expect(t.costPerUnit).toBe(10.56)
  })

  it('rejects margin >= 100', () => {
    expect(sellingPriceFromMode('margin', 25, 0, 100, 0)).toBe(0)
  })

  it('allocates overhead by method', () => {
    expect(allocateOverhead('fixed', 50, 375, 15)).toBe(50)
    expect(allocateOverhead('perUnit', 2, 375, 15)).toBe(30)
    expect(allocateOverhead('percent', 10, 375, 15)).toBe(37.5)
  })
})
