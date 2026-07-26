import type {
  CostLine,
  CostPricingPayload,
  CostPricingTotals,
  LineCostDetail,
  OverheadMethod,
  PricingMode,
} from '@/lib/cost-pricing/types'
import { convertQuantity, toSharedBase, unitsCompatible } from '@/lib/cost-pricing/units'

function n(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0
  const parsed = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

function safeDiv(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return 0
  const result = numerator / denominator
  return Number.isFinite(result) ? result : 0
}

function round2(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function round4(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round((value + Number.EPSILON) * 10000) / 10000
}

export function computeLineDetail(line: CostLine): LineCostDetail {
  const method = line.method || (n(line.fixedTotal) > 0 && !n(line.unitCost) ? 'fixedBatch' : 'qtyUnit')
  const base: LineCostDetail = {
    id: line.id,
    total: 0,
    method,
    bulkUnitCost: null,
    quantityConsumed: null,
    quantityConsumedUnit: null,
    remainingQty: null,
    remainingValue: null,
    bulkPurchaseValue: 0,
    conversionError: null,
    usageExceedsPurchase: false,
  }

  if (method === 'fixedBatch') {
    base.total = round2(Math.max(0, n(line.fixedTotal)))
    return base
  }

  if (method === 'qtyUnit') {
    base.total = round2(Math.max(0, n(line.quantity)) * Math.max(0, n(line.unitCost)))
    return base
  }

  // Bulk Purchase Usage — only consumed value enters the batch
  const purchaseQty = Math.max(0, n(line.bulkPurchaseQty))
  const purchaseAmount = Math.max(0, n(line.bulkPurchaseAmount))
  const usedQty = Math.max(0, n(line.quantityUsed))
  const purchaseUnit = line.bulkPurchaseUnit || 'pcs'
  const usageUnit = line.usageUnit || purchaseUnit

  base.bulkPurchaseValue = round2(purchaseAmount)
  base.quantityConsumed = usedQty
  base.quantityConsumedUnit = usageUnit

  if (purchaseQty <= 0) {
    base.conversionError = 'Bulk purchase quantity must be greater than zero.'
    return base
  }

  if (!unitsCompatible(purchaseUnit, usageUnit)) {
    base.conversionError = `Units are not compatible (${purchaseUnit} → ${usageUnit}).`
    return base
  }

  const shared = toSharedBase(purchaseQty, purchaseUnit, usedQty, usageUnit)
  if (!shared) {
    base.conversionError = `Units are not compatible (${purchaseUnit} → ${usageUnit}).`
    return base
  }

  const bulkUnitCostBase = safeDiv(purchaseAmount, shared.purchaseBase)
  // Display purchase cost per usage unit (e.g. AED/metre or AED/gram)
  const oneUsageInBase = convertQuantity(1, usageUnit, shared.baseUnit)
  base.bulkUnitCost =
    oneUsageInBase != null ? round4(bulkUnitCostBase * oneUsageInBase) : round4(bulkUnitCostBase)

  if (shared.usageBase > shared.purchaseBase + 1e-9) {
    base.usageExceedsPurchase = true
  }

  const costUsed = round2(bulkUnitCostBase * shared.usageBase)
  const remainingBase = Math.max(0, shared.purchaseBase - shared.usageBase)
  const remainingInUsage = convertQuantity(remainingBase, shared.baseUnit, usageUnit)

  base.total = costUsed
  base.remainingQty = remainingInUsage != null ? round4(remainingInUsage) : round4(remainingBase)
  base.remainingValue = round2(bulkUnitCostBase * remainingBase)

  return base
}

/** Line cost included in Total Batch Cost (consumed amount only). */
export function lineTotal(line: CostLine): number {
  return computeLineDetail(line).total
}

function sumByCategory(lines: CostLine[], category: CostLine['category']): number {
  return round2(
    lines
      .filter((l) => l.includeInUnitCost && l.category === category)
      .reduce((sum, l) => sum + lineTotal(l), 0),
  )
}

export function allocateOverhead(
  method: OverheadMethod,
  value: number,
  productionCost: number,
  quantity: number,
): number {
  const v = Math.max(0, value)
  if (method === 'fixed') return round2(v)
  if (method === 'perUnit') return round2(v * Math.max(0, quantity))
  if (method === 'percent') return round2(productionCost * (v / 100))
  return 0
}

export function sellingPriceFromMode(
  mode: PricingMode,
  unitCost: number,
  markupPct: number,
  marginPct: number,
  manualPrice: number,
): number {
  const cost = Math.max(0, unitCost)
  if (mode === 'manual') return round2(Math.max(0, manualPrice))
  if (mode === 'markup') return round2(cost * (1 + Math.max(0, markupPct) / 100))
  if (marginPct >= 100) return 0
  return round2(safeDiv(cost, 1 - marginPct / 100))
}

export function sellingCostsPerUnit(
  price: number,
  costs: CostPricingPayload['sellingCosts'],
): number {
  const delivery = Math.max(0, n(costs.deliveryPerUnit))
  const other = Math.max(0, n(costs.otherPerUnit))
  const commission = price * (Math.max(0, n(costs.commissionPct)) / 100)
  const marketplace = price * (Math.max(0, n(costs.marketplaceFeePct)) / 100)
  const card = price * (Math.max(0, n(costs.cardFeePct)) / 100)
  return round2(delivery + other + commission + marketplace + card)
}

export function computeCostPricing(payload: CostPricingPayload): CostPricingTotals {
  const finishedQty = Math.max(0, Math.floor(n(payload.quantity)))
  const finishedWastageQty = Math.max(0, Math.floor(n(payload.finishedWastageQty)))
  const wastageMode = payload.wastageMode || 'materialPct'
  const messages: string[] = []

  if (finishedQty <= 0) {
    messages.push('Finished quantity produced must be greater than zero.')
  }

  const lineTotals = payload.lines.map((l) => computeLineDetail(l))

  for (const line of payload.lines) {
    if (
      n(line.quantity) < 0 ||
      n(line.unitCost) < 0 ||
      n(line.fixedTotal) < 0 ||
      n(line.bulkPurchaseAmount) < 0 ||
      n(line.bulkPurchaseQty) < 0 ||
      n(line.quantityUsed) < 0
    ) {
      messages.push('Cost values cannot be negative.')
      break
    }
  }

  for (const detail of lineTotals) {
    if (!payload.lines.find((l) => l.id === detail.id)?.includeInUnitCost) continue
    if (detail.conversionError) messages.push(detail.conversionError)
    if (detail.usageExceedsPurchase) {
      messages.push('Quantity used cannot exceed available bulk quantity.')
    }
    const line = payload.lines.find((l) => l.id === detail.id)
    if (line?.method === 'bulkUsage' && n(line.bulkPurchaseQty) <= 0 && n(line.bulkPurchaseAmount) > 0) {
      messages.push('Bulk purchase quantity must be greater than zero.')
    }
  }

  const wastagePct = Math.max(0, n(payload.wastagePct))
  const contingencyPct = Math.max(0, n(payload.contingencyPct))
  const additionalFixed = Math.max(0, n(payload.additionalFixedCost))
  const overheadValue = Math.max(0, n(payload.overheadValue))
  const markupPctInput = Math.max(0, n(payload.targetMarkupPct))
  const marginPctInput = Math.max(0, n(payload.targetMarginPct))
  const manualPrice = Math.max(0, n(payload.manualSellingPrice))

  if (marginPctInput >= 100) messages.push('Target margin must be below 100%.')

  const included = payload.lines.filter((l) => l.includeInUnitCost)
  const includedDetails = lineTotals.filter((d) => included.some((l) => l.id === d.id))

  const materialsCost = sumByCategory(payload.lines, 'Materials')
  const directLabourCost = sumByCategory(payload.lines, 'Direct Labour')
  const packagingCost = sumByCategory(payload.lines, 'Packaging')
  const transportationCost = sumByCategory(payload.lines, 'Production Transportation')
  const designCost = sumByCategory(payload.lines, 'Design')
  const manufacturingOverheadCost = sumByCategory(payload.lines, 'Manufacturing Overhead')
  const otherDirectCost = sumByCategory(payload.lines, 'Other Production Cost')

  const sumIncludedLines = round2(includedDetails.reduce((sum, d) => sum + d.total, 0))
  const eligibleProductionCost = round2(sumIncludedLines + additionalFixed)

  // Material wastage % adds a cost; finished-product wastage reduces the divisor instead.
  const wastageCost =
    wastageMode === 'materialPct' ? round2(eligibleProductionCost * (wastagePct / 100)) : 0
  const contingencyCost = round2(eligibleProductionCost * (contingencyPct / 100))
  const allocatedOverhead = allocateOverhead(
    payload.overheadMethod,
    overheadValue,
    eligibleProductionCost,
    finishedQty,
  )

  const totalBatchCost = round2(
    eligibleProductionCost + wastageCost + contingencyCost + allocatedOverhead,
  )

  // Cost per finished saleable unit
  const divisor = finishedQty
  const costPerUnit = round2(safeDiv(totalBatchCost, divisor))
  const manufacturedQuantity =
    wastageMode === 'finishedQty' ? finishedQty + finishedWastageQty : finishedQty

  const suggestedSellingPrice = sellingPriceFromMode(
    payload.pricingMode,
    costPerUnit,
    markupPctInput,
    marginPctInput,
    manualPrice,
  )

  if (suggestedSellingPrice < 0) messages.push('Selling price cannot be negative.')

  const profitPerUnit = round2(suggestedSellingPrice - costPerUnit)
  const markupPct = round2(safeDiv(profitPerUnit, costPerUnit) * 100)
  const grossMarginPct = round2(safeDiv(profitPerUnit, suggestedSellingPrice) * 100)
  const totalExpectedSales = round2(suggestedSellingPrice * finishedQty)
  const totalExpectedGrossProfit = round2(profitPerUnit * finishedQty)

  const fixedCosts = round2(wastageCost + contingencyCost + allocatedOverhead + additionalFixed)
  const variableBatch = round2(totalBatchCost - fixedCosts)
  const variablePerUnit = round2(safeDiv(variableBatch, finishedQty))
  const contribution = round2(suggestedSellingPrice - variablePerUnit)
  const breakEvenQuantity =
    contribution > 0 ? Math.ceil(safeDiv(fixedCosts, contribution)) : 0

  const sellCosts = sellingCostsPerUnit(suggestedSellingPrice, payload.sellingCosts)
  const productGrossProfit = round2(suggestedSellingPrice - costPerUnit)
  const profitAfterSellingCosts = round2(suggestedSellingPrice - costPerUnit - sellCosts)

  const bulkPurchaseValue = round2(
    includedDetails.reduce((s, d) => s + (d.method === 'bulkUsage' ? d.bulkPurchaseValue : 0), 0),
  )
  const costConsumedInBatch = round2(
    includedDetails.reduce((s, d) => s + (d.method === 'bulkUsage' ? d.total : 0), 0),
  )
  const unusedMaterialValue = round2(
    includedDetails.reduce(
      (s, d) => s + (d.method === 'bulkUsage' ? (d.remainingValue ?? 0) : 0),
      0,
    ),
  )

  const expectedBatch = round2(
    sumIncludedLines + additionalFixed + wastageCost + contingencyCost + allocatedOverhead,
  )
  if (Math.abs(expectedBatch - totalBatchCost) > 0.02) {
    messages.push('Total batch cost must equal the sum of included costs.')
  }
  if (finishedQty > 0 && Math.abs(costPerUnit - safeDiv(totalBatchCost, finishedQty)) > 0.02) {
    messages.push('Unit cost must equal total batch cost divided by finished quantity.')
  }

  // Deduplicate validation messages
  const uniqueMessages = [...new Set(messages)]

  return {
    materialsCost,
    directLabourCost,
    packagingCost,
    transportationCost,
    otherDirectCost: round2(otherDirectCost + designCost + manufacturingOverheadCost),
    designCost,
    manufacturingOverheadCost,
    eligibleProductionCost,
    wastageCost,
    contingencyCost,
    additionalFixedCost: additionalFixed,
    allocatedOverhead,
    totalBatchCost,
    quantity: finishedQty,
    manufacturedQuantity,
    finishedWastageQty,
    costPerUnit,
    suggestedSellingPrice,
    profitPerUnit,
    markupPct,
    grossMarginPct,
    totalExpectedSales,
    totalExpectedGrossProfit,
    breakEvenQuantity,
    sellingCostsPerUnit: sellCosts,
    productGrossProfit,
    profitAfterSellingCosts,
    lineTotals,
    bulkPurchaseValue,
    costConsumedInBatch,
    unusedMaterialValue,
    validation: { ok: uniqueMessages.length === 0, messages: uniqueMessages },
  }
}

export function scenarioMetrics(unitCost: number, sellingPrice: number) {
  const cost = Math.max(0, unitCost)
  const price = Math.max(0, sellingPrice)
  const profit = round2(price - cost)
  return {
    sellingPrice: round2(price),
    profitPerUnit: profit,
    markupPct: round2(safeDiv(profit, cost) * 100),
    marginPct: round2(safeDiv(profit, price) * 100),
  }
}

export function autoScenarios(unitCost: number, recommended: number) {
  const rec = Math.max(0, recommended)
  const low = round2(rec > 0 ? rec * 0.85 : unitCost * 1.2)
  const premium = round2(rec > 0 ? rec * 1.2 : unitCost * 1.8)
  return { low, recommended: rec, premium }
}
