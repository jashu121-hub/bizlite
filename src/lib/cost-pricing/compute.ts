import type {
  CostLine,
  CostPricingPayload,
  CostPricingTotals,
  OverheadMethod,
  PricingMode,
} from '@/lib/cost-pricing/types'

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

export function lineTotal(line: CostLine): number {
  const fixed = Math.max(0, n(line.fixedTotal))
  const qty = Math.max(0, n(line.quantity))
  const unit = Math.max(0, n(line.unitCost))
  // Fixed total when unit cost is blank (manual lump-sum entry).
  if (fixed > 0 && unit === 0) return round2(fixed)
  if (qty > 0 || unit > 0) return round2(qty * unit)
  return round2(fixed)
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
  // Margin: SP = cost / (1 - margin%). Margin must be < 100%.
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
  const quantity = Math.max(0, Math.floor(n(payload.quantity)))
  const messages: string[] = []

  if (quantity <= 0) messages.push('Quantity produced must be greater than zero.')

  for (const line of payload.lines) {
    if (n(line.quantity) < 0 || n(line.unitCost) < 0 || n(line.fixedTotal) < 0) {
      messages.push('Cost amounts cannot be negative.')
      break
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
  const lineTotals = payload.lines.map((l) => ({ id: l.id, total: lineTotal(l) }))

  const materialsCost = sumByCategory(payload.lines, 'Materials')
  const directLabourCost = sumByCategory(payload.lines, 'Direct Labour')
  const packagingCost = sumByCategory(payload.lines, 'Packaging')
  const transportationCost = sumByCategory(payload.lines, 'Production Transportation')
  const designCost = sumByCategory(payload.lines, 'Design')
  const manufacturingOverheadCost = sumByCategory(payload.lines, 'Manufacturing Overhead')
  const otherDirectCost = sumByCategory(payload.lines, 'Other Production Cost')

  const eligibleProductionCost = round2(
    included.reduce((sum, l) => sum + lineTotal(l), 0) + additionalFixed,
  )

  const wastageCost = round2(eligibleProductionCost * (wastagePct / 100))
  const contingencyCost = round2(eligibleProductionCost * (contingencyPct / 100))
  const allocatedOverhead = allocateOverhead(
    payload.overheadMethod,
    overheadValue,
    eligibleProductionCost,
    quantity,
  )

  const totalBatchCost = round2(
    eligibleProductionCost + wastageCost + contingencyCost + allocatedOverhead,
  )
  const costPerUnit = round2(safeDiv(totalBatchCost, quantity))

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
  const totalExpectedSales = round2(suggestedSellingPrice * quantity)
  const totalExpectedGrossProfit = round2(profitPerUnit * quantity)

  // Break-even: fixed costs / contribution. Fixed ≈ wastage + contingency + overhead + additional fixed
  // Contribution = selling price − variable unit cost (approx unit cost without those fixed parts).
  const fixedCosts = round2(wastageCost + contingencyCost + allocatedOverhead + additionalFixed)
  const variableBatch = round2(totalBatchCost - fixedCosts)
  const variablePerUnit = round2(safeDiv(variableBatch, quantity))
  const contribution = round2(suggestedSellingPrice - variablePerUnit)
  const breakEvenQuantity =
    contribution > 0 ? Math.ceil(safeDiv(fixedCosts, contribution)) : 0

  const sellCosts = sellingCostsPerUnit(suggestedSellingPrice, payload.sellingCosts)
  const productGrossProfit = round2(suggestedSellingPrice - costPerUnit)
  const profitAfterSellingCosts = round2(suggestedSellingPrice - costPerUnit - sellCosts)

  // Reconciliation checks
  const sumIncluded = round2(included.reduce((s, l) => s + lineTotal(l), 0))
  const expectedBatch = round2(
    sumIncluded + additionalFixed + wastageCost + contingencyCost + allocatedOverhead,
  )
  if (Math.abs(expectedBatch - totalBatchCost) > 0.02) {
    messages.push('Total batch cost must equal the sum of included costs.')
  }
  if (quantity > 0 && Math.abs(costPerUnit - safeDiv(totalBatchCost, quantity)) > 0.02) {
    messages.push('Unit cost must equal total batch cost divided by quantity.')
  }

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
    quantity,
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
    validation: { ok: messages.length === 0, messages },
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
