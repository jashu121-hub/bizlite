export type CostLineCategory =
  | 'Materials'
  | 'Direct Labour'
  | 'Packaging'
  | 'Design'
  | 'Production Transportation'
  | 'Manufacturing Overhead'
  | 'Other Production Cost'

export type CostLine = {
  id: string
  name: string
  category: CostLineCategory
  description: string
  quantity: string
  unitCost: string
  /** When set (and qty/unit empty), used as fixed line total. */
  fixedTotal: string
  includeInUnitCost: boolean
}

export type OverheadMethod = 'fixed' | 'perUnit' | 'percent'

export type PricingMode = 'markup' | 'margin' | 'manual'

export type PriceScenario = {
  id: string
  label: string
  sellingPrice: string
}

export type SellingCosts = {
  deliveryPerUnit: string
  commissionPct: string
  marketplaceFeePct: string
  cardFeePct: string
  otherPerUnit: string
}

export type CostPricingPayload = {
  productId: string
  name: string
  category: string
  quantity: number
  unit: string
  calculationDate: string
  notes: string
  lines: CostLine[]
  wastagePct: string
  contingencyPct: string
  additionalFixedCost: string
  overheadMethod: OverheadMethod
  overheadValue: string
  overheadLabel: string
  pricingMode: PricingMode
  targetMarkupPct: string
  targetMarginPct: string
  manualSellingPrice: string
  sellingCosts: SellingCosts
  scenarios: PriceScenario[]
}

export type CostPricingTotals = {
  materialsCost: number
  directLabourCost: number
  packagingCost: number
  transportationCost: number
  otherDirectCost: number
  designCost: number
  manufacturingOverheadCost: number
  eligibleProductionCost: number
  wastageCost: number
  contingencyCost: number
  additionalFixedCost: number
  allocatedOverhead: number
  totalBatchCost: number
  quantity: number
  costPerUnit: number
  suggestedSellingPrice: number
  profitPerUnit: number
  markupPct: number
  grossMarginPct: number
  totalExpectedSales: number
  totalExpectedGrossProfit: number
  breakEvenQuantity: number
  sellingCostsPerUnit: number
  productGrossProfit: number
  profitAfterSellingCosts: number
  lineTotals: { id: string; total: number }[]
  validation: { ok: boolean; messages: string[] }
}
