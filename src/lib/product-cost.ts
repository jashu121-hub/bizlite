import { addMoney, D, divMoney, money, moneyString, percent, subMoney, type MoneyInput } from '@/lib/money'

export type CustomCostLine = {
  id: string
  name?: string
  amount: string
}

export type ProductCostBreakdown = {
  productionQuantity: number
  materials: string
  stitching: string
  design: string
  packaging: string
  inwardTransport: string
  customs: string
  otherProduction: string
  customProductionCosts: CustomCostLine[]
  marketing: string
  commission: string
  outwardDelivery: string
  marketplaceFees: string
  otherSelling: string
  totalProductionCost: string
  inventoryCostPerUnit: string
  totalSellingCost: string
  sellingCostPerUnit: string
  fullCostPerUnit: string
}

export type ProductCostTotals = {
  productionQuantity: number
  totalProductionCost: string
  inventoryCostPerUnit: string
  totalSellingCost: string
  sellingCostPerUnit: string
  fullCostPerUnit: string
  grossProfitPerUnit: string
  estimatedFinalProfitPerUnit: string
  grossMarginPct: string
  estimatedFinalMarginPct: string
}

export const emptyCostBreakdown = (quantity = 0): ProductCostBreakdown => ({
  productionQuantity: quantity,
  materials: '',
  stitching: '',
  design: '',
  packaging: '',
  inwardTransport: '',
  customs: '',
  otherProduction: '',
  customProductionCosts: [],
  marketing: '',
  commission: '',
  outwardDelivery: '',
  marketplaceFees: '',
  otherSelling: '',
  totalProductionCost: '0.00',
  inventoryCostPerUnit: '0.00',
  totalSellingCost: '0.00',
  sellingCostPerUnit: '0.00',
  fullCostPerUnit: '0.00',
})

/** Keep empty fields empty; never force 0.00 into editable money fields. */
function fieldMoney(value: MoneyInput | undefined): string {
  if (value === '' || value === null || value === undefined) return ''
  const raw = String(value).trim()
  if (raw === '') return ''
  const amount = money(raw)
  if (amount.isNeg()) return ''
  return raw
}

export function normalizeCostBreakdown(
  input?: Partial<ProductCostBreakdown> | null,
): ProductCostBreakdown {
  const qtyRaw = input?.productionQuantity
  const productionQuantity =
    qtyRaw === undefined || qtyRaw === null || Number.isNaN(Number(qtyRaw))
      ? 0
      : Math.max(0, Math.floor(Number(qtyRaw)))

  const base = emptyCostBreakdown(productionQuantity)
  const custom = Array.isArray(input?.customProductionCosts)
    ? input!.customProductionCosts.map((line, index) => ({
        id: line.id || `custom-${index}`,
        name: line.name || '',
        amount: fieldMoney(line.amount),
      }))
    : []

  const draft: ProductCostBreakdown = {
    ...base,
    ...input,
    productionQuantity,
    materials: fieldMoney(input?.materials),
    stitching: fieldMoney(input?.stitching),
    design: fieldMoney(input?.design),
    packaging: fieldMoney(input?.packaging),
    inwardTransport: fieldMoney(input?.inwardTransport),
    customs: fieldMoney(input?.customs),
    otherProduction: fieldMoney(input?.otherProduction),
    customProductionCosts: custom,
    marketing: fieldMoney(input?.marketing),
    commission: fieldMoney(input?.commission),
    outwardDelivery: fieldMoney(input?.outwardDelivery),
    marketplaceFees: fieldMoney(input?.marketplaceFees),
    otherSelling: fieldMoney(input?.otherSelling),
  }

  return withComputedTotals(draft)
}

export function computeCostTotals(
  breakdown: ProductCostBreakdown,
  sellingPrice: MoneyInput = 0,
): ProductCostTotals {
  const qty = Math.max(1, Math.floor(breakdown.productionQuantity || 1))
  const customTotal = addMoney(
    ...breakdown.customProductionCosts.map((line) => line.amount || 0),
  )
  const totalProductionCost = addMoney(
    breakdown.materials,
    breakdown.stitching,
    breakdown.design,
    breakdown.packaging,
    breakdown.inwardTransport,
    breakdown.customs,
    breakdown.otherProduction,
    customTotal,
  )
  const totalSellingCost = addMoney(
    breakdown.marketing,
    breakdown.commission,
    breakdown.outwardDelivery,
    breakdown.marketplaceFees,
    breakdown.otherSelling,
  )
  const inventoryCostPerUnit = divMoney(totalProductionCost, qty)
  const sellingCostPerUnit = divMoney(totalSellingCost, qty)
  const fullCostPerUnit = addMoney(inventoryCostPerUnit, sellingCostPerUnit)
  const sell = money(sellingPrice)
  const grossProfitPerUnit = subMoney(sell, inventoryCostPerUnit)
  const estimatedFinalProfitPerUnit = subMoney(sell, fullCostPerUnit)

  return {
    productionQuantity: qty,
    totalProductionCost: moneyString(totalProductionCost),
    inventoryCostPerUnit: moneyString(inventoryCostPerUnit),
    totalSellingCost: moneyString(totalSellingCost),
    sellingCostPerUnit: moneyString(sellingCostPerUnit),
    fullCostPerUnit: moneyString(fullCostPerUnit),
    grossProfitPerUnit: moneyString(grossProfitPerUnit),
    estimatedFinalProfitPerUnit: moneyString(estimatedFinalProfitPerUnit),
    grossMarginPct: moneyString(percent(grossProfitPerUnit, sell)),
    estimatedFinalMarginPct: moneyString(percent(estimatedFinalProfitPerUnit, sell)),
  }
}

export function withComputedTotals(breakdown: ProductCostBreakdown): ProductCostBreakdown {
  const totals = computeCostTotals(breakdown)
  return {
    ...breakdown,
    // Preserve the form quantity (0 = empty); do not force calculated min of 1 into the input
    productionQuantity: breakdown.productionQuantity,
    totalProductionCost: totals.totalProductionCost,
    inventoryCostPerUnit: totals.inventoryCostPerUnit,
    totalSellingCost: totals.totalSellingCost,
    sellingCostPerUnit: totals.sellingCostPerUnit,
    fullCostPerUnit: totals.fullCostPerUnit,
  }
}

export function weightedAverageCost(
  existingQty: number,
  existingUnitCost: MoneyInput,
  newQty: number,
  newUnitCost: MoneyInput,
): string {
  const existing = Math.max(0, existingQty)
  const incoming = Math.max(0, newQty)
  const totalQty = existing + incoming
  if (totalQty <= 0) return moneyString(0)
  const existingValue = D(existingUnitCost).times(existing)
  const newValue = D(newUnitCost).times(incoming)
  return moneyString(existingValue.plus(newValue).div(totalQty))
}

export function parseCostBreakdown(raw: unknown): ProductCostBreakdown | null {
  if (!raw || typeof raw !== 'object') return null
  return normalizeCostBreakdown(raw as Partial<ProductCostBreakdown>)
}
