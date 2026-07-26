import type { CostLine, CostPricingPayload } from '@/lib/cost-pricing/types'

function lineId() {
  return `line_${Math.random().toString(36).slice(2, 10)}`
}

export function createEmptyCostLine(
  category: CostLine['category'] = 'Materials',
  name = '',
): CostLine {
  return {
    id: lineId(),
    name: name || category,
    category,
    description: '',
    quantity: '1',
    unitCost: '',
    fixedTotal: '',
    includeInUnitCost: true,
  }
}

export function defaultCostLines(): CostLine[] {
  return [
    createEmptyCostLine('Materials', 'Materials'),
    createEmptyCostLine('Direct Labour', 'Direct labour'),
    createEmptyCostLine('Packaging', 'Packaging'),
    createEmptyCostLine('Production Transportation', 'Transportation'),
  ]
}

export function createDefaultPayload(partial?: Partial<CostPricingPayload>): CostPricingPayload {
  const today = new Date().toISOString().slice(0, 10)
  return {
    productId: '',
    name: '',
    category: '',
    quantity: 1,
    unit: 'pcs',
    calculationDate: today,
    notes: '',
    lines: defaultCostLines(),
    wastagePct: '',
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
    ...partial,
  }
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

export const UNIT_OPTIONS = ['pcs', 'kg', 'g', 'L', 'ml', 'm', 'box', 'pack', 'set', 'hour'] as const
