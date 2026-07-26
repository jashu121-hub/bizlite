/** Suggested categories; custom strings are also allowed. */
export type CostLineCategory = string

export type CostLineMethod =
  | 'fixedBatch'
  | 'bulkUsage'
  | 'qtyUnit'
  | 'labourHours'
  | 'perFinishedUnit'

export type CostLine = {
  id: string
  name: string
  category: CostLineCategory
  description: string
  method: CostLineMethod
  /** Quantity × Rate / Labour hours */
  quantity: string
  unit: string
  unitCost: string
  /** Fixed Batch Amount */
  fixedTotal: string
  /** Bulk Material Consumption */
  bulkPurchaseQty: string
  bulkPurchaseUnit: string
  bulkPurchaseAmount: string
  quantityUsed: string
  usageUnit: string
  includeInUnitCost: boolean
}

export type OverheadMethod = 'fixed' | 'perUnit' | 'percent'

export type PricingMode = 'markup' | 'margin' | 'manual'

export type WastageMode = 'materialPct' | 'finishedQty'

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
  /** Finished units entered (saleable after finished wastage is deducted) */
  quantity: number
  unit: string
  calculationDate: string
  notes: string
  lines: CostLine[]
  wastageMode: WastageMode
  wastagePct: string
  finishedWastageQty: string
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

export type LineCostDetail = {
  id: string
  total: number
  method: CostLineMethod
  bulkUnitCost: number | null
  quantityConsumed: number | null
  quantityConsumedUnit: string | null
  remainingQty: number | null
  remainingValue: number | null
  bulkPurchaseValue: number
  conversionError: string | null
  usageExceedsPurchase: boolean
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
  /** Saleable finished quantity used as divisor */
  quantity: number
  manufacturedQuantity: number
  finishedWastageQty: number
  costPerUnit: number
  suggestedSellingPrice: number
  profitPerUnit: number
  markupPct: number
  grossMarginPct: number
  totalExpectedSales: number
  totalExpectedGrossProfit: number
  /** Expected batch net profit after selling costs */
  totalExpectedNetProfit: number
  breakEvenQuantity: number
  sellingCostsPerUnit: number
  productGrossProfit: number
  profitAfterSellingCosts: number
  lineTotals: LineCostDetail[]
  bulkPurchaseValue: number
  costConsumedInBatch: number
  unusedMaterialValue: number
  validation: { ok: boolean; messages: string[] }
}
