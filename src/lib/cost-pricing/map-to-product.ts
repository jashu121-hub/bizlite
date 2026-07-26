import type { CostPricingPayload, CostPricingTotals } from '@/lib/cost-pricing/types'
import {
  emptyCostBreakdown,
  normalizeCostBreakdown,
  type ProductCostBreakdown,
} from '@/lib/product-cost'
import { moneyString } from '@/lib/money'

/** Map calculator state into the product catalog costBreakdown shape. */
export function payloadToProductCostBreakdown(
  payload: CostPricingPayload,
  totals: CostPricingTotals,
): ProductCostBreakdown {
  const custom = [
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
    totals.otherDirectCost > 0
      ? {
          id: 'other-direct',
          name: 'Other Direct Production Cost',
          amount: moneyString(totals.otherDirectCost),
        }
      : null,
  ].filter(Boolean) as { id: string; name: string; amount: string }[]

  const base = emptyCostBreakdown(totals.quantity)
  return normalizeCostBreakdown({
    ...base,
    productionQuantity: totals.quantity,
    materials: moneyString(totals.materialsCost),
    stitching: moneyString(totals.directLabourCost),
    packaging: moneyString(totals.packagingCost),
    inwardTransport: moneyString(totals.transportationCost),
    customProductionCosts: custom,
  })
}
