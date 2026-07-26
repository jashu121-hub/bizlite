import { money, moneyNumber, type MoneyInput } from '@/lib/money'
import { parseCostBreakdown, type ProductCostBreakdown } from '@/lib/product-cost'

export type CogsCostComponent = {
  key: string
  label: string
  batchAmount: number
  perUnitAmount: number
  soldAmount: number
}

export type ProductCogsReconciliation = {
  productId: string
  productName: string
  quantitySold: number
  saleTimeUnitCost: number
  catalogUnitCost: number | null
  lineCogs: number
  productionBatchQuantity: number | null
  totalProductionBatchCost: number | null
  inventoryCostPerUnitFromBreakdown: number | null
  components: CogsCostComponent[]
  componentsExplainUnitCost: boolean
  inventory: {
    openingStock: number
    stockAdded: number
    stockSold: number
    stockAdjustments: number
    currentStock: number
    movements: {
      id: string
      type: string
      quantity: number
      date: string
      notes: string | null
      saleId: string | null
    }[]
  } | null
}

const PRODUCTION_COMPONENT_DEFS: {
  key: keyof ProductCostBreakdown
  label: string
}[] = [
  { key: 'materials', label: 'Materials' },
  { key: 'stitching', label: 'Direct labour / stitching' },
  { key: 'design', label: 'Design' },
  { key: 'packaging', label: 'Packaging' },
  { key: 'inwardTransport', label: 'Production / inward transport' },
  { key: 'customs', label: 'Customs' },
  { key: 'otherProduction', label: 'Other production costs' },
]

function componentAmount(value: MoneyInput | undefined) {
  if (value === '' || value === null || value === undefined) return 0
  return moneyNumber(value)
}

/**
 * Explain sale-time unit cost from the product cost calculator breakdown,
 * scaled to the quantity sold in the report period.
 */
export function explainUnitCostFromBreakdown(
  breakdownRaw: unknown,
  quantitySold: number,
  saleTimeUnitCost: number,
): Pick<
  ProductCogsReconciliation,
  | 'components'
  | 'componentsExplainUnitCost'
  | 'productionBatchQuantity'
  | 'totalProductionBatchCost'
  | 'inventoryCostPerUnitFromBreakdown'
> {
  const breakdown = parseCostBreakdown(breakdownRaw)
  if (!breakdown || quantitySold === 0) {
    return {
      components: [],
      componentsExplainUnitCost: false,
      productionBatchQuantity: null,
      totalProductionBatchCost: null,
      inventoryCostPerUnitFromBreakdown: null,
    }
  }

  const batchQty = Math.max(0, Math.floor(breakdown.productionQuantity || 0))
  const components: CogsCostComponent[] = []

  const scaleSold = (batchAmount: number) => {
    if (batchQty <= 0) return 0
    // Scale batch totals by sold/batch so qty-sold = batch qty preserves exact component totals.
    return moneyNumber(money(batchAmount).times(quantitySold).div(batchQty))
  }
  const perUnit = (batchAmount: number) =>
    batchQty > 0 ? moneyNumber(money(batchAmount).div(batchQty)) : 0

  for (const def of PRODUCTION_COMPONENT_DEFS) {
    const batchAmount = componentAmount(breakdown[def.key] as MoneyInput)
    if (batchAmount === 0) continue
    components.push({
      key: def.key,
      label: def.label,
      batchAmount,
      perUnitAmount: perUnit(batchAmount),
      soldAmount: scaleSold(batchAmount),
    })
  }

  for (const custom of breakdown.customProductionCosts ?? []) {
    const batchAmount = componentAmount(custom.amount)
    if (batchAmount === 0) continue
    components.push({
      key: custom.id,
      label: custom.name?.trim() || 'Custom production cost',
      batchAmount,
      perUnitAmount: perUnit(batchAmount),
      soldAmount: scaleSold(batchAmount),
    })
  }

  const inventoryCostPerUnitFromBreakdown = componentAmount(breakdown.inventoryCostPerUnit)
  const totalProductionBatchCost = componentAmount(breakdown.totalProductionCost)
  const componentsExplainUnitCost =
    inventoryCostPerUnitFromBreakdown > 0 &&
    Math.abs(inventoryCostPerUnitFromBreakdown - saleTimeUnitCost) < 0.005

  return {
    components,
    componentsExplainUnitCost,
    productionBatchQuantity: batchQty || null,
    totalProductionBatchCost: totalProductionBatchCost || null,
    inventoryCostPerUnitFromBreakdown: inventoryCostPerUnitFromBreakdown || null,
  }
}
