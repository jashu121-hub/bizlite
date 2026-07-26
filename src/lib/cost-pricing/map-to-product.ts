import { lineTotal } from '@/lib/cost-pricing/compute'
import type { CostPricingPayload, CostPricingTotals } from '@/lib/cost-pricing/types'
import {
  emptyCostBreakdown,
  normalizeCostBreakdown,
  type ProductCostBreakdown,
} from '@/lib/product-cost'
import { moneyString } from '@/lib/money'

function sumCategory(payload: CostPricingPayload, category: string): number {
  return payload.lines
    .filter((l) => l.includeInUnitCost && l.category === category)
    .reduce((sum, l) => sum + lineTotal(l), 0)
}

/** Map calculator state into the product catalog costBreakdown shape. */
export function payloadToProductCostBreakdown(
  payload: CostPricingPayload,
  totals: CostPricingTotals,
): ProductCostBreakdown {
  const materials = sumCategory(payload, 'Materials')
  const labour = sumCategory(payload, 'Direct Labour')
  const packaging = sumCategory(payload, 'Packaging')
  const transport = sumCategory(payload, 'Production Transportation')
  const design = sumCategory(payload, 'Design')
  const mfgOh = sumCategory(payload, 'Manufacturing Overhead')
  const other = sumCategory(payload, 'Other Production Cost')

  const custom = [
    mfgOh > 0
      ? { id: 'mfg-overhead', name: 'Manufacturing Overhead', amount: moneyString(mfgOh) }
      : null,
    totals.wastageCost > 0
      ? { id: 'wastage', name: 'Wastage', amount: moneyString(totals.wastageCost) }
      : null,
    totals.contingencyCost > 0
      ? { id: 'contingency', name: 'Contingency', amount: moneyString(totals.contingencyCost) }
      : null,
    totals.additionalFixedCost > 0
      ? {
          id: 'additional-fixed',
          name: 'Additional fixed production cost',
          amount: moneyString(totals.additionalFixedCost),
        }
      : null,
    totals.allocatedOverhead > 0
      ? {
          id: 'allocated-overhead',
          name: payload.overheadLabel?.trim() || 'Allocated overhead',
          amount: moneyString(totals.allocatedOverhead),
        }
      : null,
  ].filter(Boolean) as { id: string; name: string; amount: string }[]

  const base = emptyCostBreakdown(payload.quantity)
  return normalizeCostBreakdown({
    ...base,
    productionQuantity: payload.quantity,
    materials: moneyString(materials),
    stitching: moneyString(labour),
    design: moneyString(design),
    packaging: moneyString(packaging),
    inwardTransport: moneyString(transport),
    otherProduction: moneyString(other),
    customProductionCosts: custom,
  })
}
