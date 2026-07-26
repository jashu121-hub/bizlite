export type CostLineCategory =
  | 'Materials'
  | 'Direct Labour'
  | 'Packaging'
  | 'Design'
  | 'Production Transportation'
  | 'Manufacturing Overhead'
  | 'Other Production Cost'

export type CostLineMethod = 'qtyUnit' | 'fixedBatch' | 'bulkUsage'

export type CostLine = {
  id: string
  name: string
  category: CostLineCategory
  description: string
  method: CostLineMethod
  /** Quantity × Unit Cost */
  quantity: string
  unit: string
  unitCost: string
  /** Fixed Batch Cost */
  fixedTotal: string
  /** Bulk Purchase Usage */
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
  /** Finished saleable quantity produced */
  quantity: number
  unit: string
  calculationDate: string
  notes: string
  lines: CostLine[]
  wastageMode: WastageMode
  wastagePct: string
  /** Damaged / unsaleable finished units (absorbed into saleable unit cost) */
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
  /** Finished saleable quantity used as divisor */
  quantity: number
  /** Manufactured total when finished wastage mode is used */
  manufacturedQuantity: number
  finishedWastageQty: number
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
  lineTotals: LineCostDetail[]
  bulkPurchaseValue: number
  costConsumedInBatch: number
  unusedMaterialValue: number
  validation: { ok: boolean; messages: string[] }
}
