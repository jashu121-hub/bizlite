import { describe, expect, it } from 'vitest'
import {
  allocateOverhead,
  computeCostPricing,
  lineTotal,
  sellingPriceFromMode,
} from '@/lib/cost-pricing/compute'
import { createDefaultPayload, createEmptyCostLine } from '@/lib/cost-pricing/defaults'

describe('cost pricing compute', () => {
  it('computes line total from qty × unit cost', () => {
    const line = createEmptyCostLine('Materials', 'Fabric')
    line.quantity = '15'
    line.unitCost = '20'
    expect(lineTotal(line)).toBe(300)
  })

  it('supports fixed total without qty/unit', () => {
    const line = createEmptyCostLine('Materials', 'Materials')
    line.quantity = ''
    line.unitCost = ''
    line.fixedTotal = '300'
    expect(lineTotal(line)).toBe(300)
  })

  it('matches the T-shirt batch example', () => {
    const payload = createDefaultPayload({
      quantity: 15,
      lines: [
        { ...createEmptyCostLine('Materials'), fixedTotal: '300', quantity: '', unitCost: '' },
        { ...createEmptyCostLine('Direct Labour'), fixedTotal: '45', quantity: '', unitCost: '' },
        { ...createEmptyCostLine('Packaging'), fixedTotal: '15', quantity: '', unitCost: '' },
        {
          ...createEmptyCostLine('Production Transportation'),
          fixedTotal: '15',
          quantity: '',
          unitCost: '',
        },
      ],
      pricingMode: 'markup',
      targetMarkupPct: '40',
    })
    const t = computeCostPricing(payload)
    expect(t.totalBatchCost).toBe(375)
    expect(t.costPerUnit).toBe(25)
    expect(t.suggestedSellingPrice).toBe(35)
    expect(t.profitPerUnit).toBe(10)
    expect(t.markupPct).toBe(40)
    expect(t.grossMarginPct).toBe(28.57)
  })

  it('computes margin pricing differently from markup', () => {
    const price = sellingPriceFromMode('margin', 25, 40, 40, 0)
    expect(price).toBe(41.67)
    const profit = round2(price - 25)
    expect(profit).toBe(16.67)
    expect(round2((profit / price) * 100)).toBe(40)
  })

  it('handles zero quantity safely', () => {
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

  it('rejects margin >= 100', () => {
    expect(sellingPriceFromMode('margin', 25, 0, 100, 0)).toBe(0)
    const payload = createDefaultPayload({
      quantity: 15,
      targetMarginPct: '100',
      pricingMode: 'margin',
    })
    expect(computeCostPricing(payload).validation.ok).toBe(false)
  })
})

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}
