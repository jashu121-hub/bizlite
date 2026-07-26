import type { CostLine, CostLineMethod, CostPricingPayload } from '@/lib/cost-pricing/types'

function lineId() {
  return `line_${Math.random().toString(36).slice(2, 10)}`
}

export function createEmptyCostLine(
  category: CostLine['category'] = 'Materials',
  name = '',
  method: CostLineMethod = 'fixedBatch',
): CostLine {
  return {
    id: lineId(),
    name: name || category,
    category,
    description: '',
    method,
    quantity: '',
    unit: 'pcs',
    unitCost: '',
    fixedTotal: '',
    bulkPurchaseQty: '',
    bulkPurchaseUnit: 'm',
    bulkPurchaseAmount: '',
    quantityUsed: '',
    usageUnit: 'm',
    includeInUnitCost: true,
  }
}

export function defaultCostLines(): CostLine[] {
  return [
    createEmptyCostLine('Materials', 'Materials', 'fixedBatch'),
    createEmptyCostLine('Direct Labour', 'Direct labour', 'fixedBatch'),
    createEmptyCostLine('Packaging', 'Packaging', 'fixedBatch'),
    createEmptyCostLine('Production Transportation', 'Transportation', 'fixedBatch'),
  ]
}

/** Normalize older saved payloads that lack method / bulk fields. */
export function normalizeCostLine(raw: Partial<CostLine> & { id?: string }): CostLine {
  const inferredMethod: CostLineMethod =
    raw.method ||
    (raw.bulkPurchaseAmount || raw.bulkPurchaseQty
      ? 'bulkUsage'
      : raw.fixedTotal && !raw.unitCost
        ? 'fixedBatch'
        : 'qtyUnit')

  return {
    ...createEmptyCostLine(raw.category || 'Materials', raw.name || '', inferredMethod),
    ...raw,
    id: raw.id || lineId(),
    method: inferredMethod,
    unit: raw.unit || 'pcs',
    bulkPurchaseUnit: raw.bulkPurchaseUnit || 'm',
    usageUnit: raw.usageUnit || raw.bulkPurchaseUnit || 'm',
    includeInUnitCost: raw.includeInUnitCost !== false,
  }
}

export function createDefaultPayload(partial?: Partial<CostPricingPayload>): CostPricingPayload {
  const today = new Date().toISOString().slice(0, 10)
  const base: CostPricingPayload = {
    productId: '',
    name: '',
    category: '',
    quantity: 1,
    unit: 'pcs',
    calculationDate: today,
    notes: '',
    lines: defaultCostLines(),
    wastageMode: 'materialPct',
    wastagePct: '',
    finishedWastageQty: '',
    contingencyPct: '',
    additionalFixedCost: '',
    overheadMethod: 'fixed',
    overheadValue: '',
    overheadLabel: '',
    pricingMode: 'markup',
    targetMarkupPct: '40',
    targetMarginPct: '40',
    manualSellingPrice: '',
    sellingCosts: {
      deliveryPerUnit: '',
      commissionPct: '',
      marketplaceFeePct: '',
      cardFeePct: '',
      otherPerUnit: '',
    },
    scenarios: [
      { id: 'low', label: 'Low Price', sellingPrice: '' },
      { id: 'recommended', label: 'Recommended', sellingPrice: '' },
      { id: 'premium', label: 'Premium Price', sellingPrice: '' },
    ],
  }
  const merged = { ...base, ...partial }
  merged.lines = (merged.lines || []).map((l) => normalizeCostLine(l))
  if (!merged.wastageMode) merged.wastageMode = 'materialPct'
  return merged
}

export const COST_CATEGORIES: CostLine['category'][] = [
  'Materials',
  'Direct Labour',
  'Packaging',
  'Design',
  'Production Transportation',
  'Manufacturing Overhead',
  'Other Production Cost',
]

export const COST_LINE_METHODS: { value: CostLineMethod; label: string }[] = [
  { value: 'qtyUnit', label: 'Quantity × Unit Cost' },
  { value: 'fixedBatch', label: 'Fixed Batch Cost' },
  { value: 'bulkUsage', label: 'Bulk Purchase Usage' },
]

export { MEASURE_UNIT_OPTIONS as UNIT_OPTIONS } from '@/lib/cost-pricing/units'
