import type { ExpenseCategory, ExpenseCostType, ExpenseSubcategory } from '@prisma/client'

export type CostTypeKey = ExpenseCostType
export type TransportSubcategory = ExpenseSubcategory

export const COST_TYPES = [
  { value: 'PRODUCTION' as const, label: 'Production Cost' },
  { value: 'SELLING' as const, label: 'Selling Cost' },
  { value: 'OVERHEAD' as const, label: 'Overhead Cost' },
]

export const TRANSPORT_SUBCATEGORIES = [
  {
    value: 'INWARD_TRANSPORT' as const,
    label: 'Inward Transport',
    costType: 'PRODUCTION' as const,
  },
  {
    value: 'CUSTOMER_DELIVERY' as const,
    label: 'Customer Delivery',
    costType: 'SELLING' as const,
  },
  {
    value: 'GENERAL_TRANSPORT' as const,
    label: 'General Business Transport',
    costType: 'OVERHEAD' as const,
  },
]

/** System defaults for new expenses (and historical backfill). Transport has no silent default. */
export const SYSTEM_CATEGORY_COST_DEFAULTS: Record<ExpenseCategory, ExpenseCostType | null> = {
  MATERIALS: 'PRODUCTION',
  PACKAGING: 'PRODUCTION',
  MARKETING: 'SELLING',
  SALARY: 'OVERHEAD',
  UTILITIES: 'OVERHEAD',
  RENT: 'OVERHEAD',
  MAINTENANCE: 'OVERHEAD',
  OTHER: 'OVERHEAD',
  TRANSPORT: null,
}

export type ExpenseCostDefaultsMap = Partial<Record<ExpenseCategory, ExpenseCostType | null>>

export function parseExpenseCostDefaults(raw: unknown): ExpenseCostDefaultsMap {
  if (!raw || typeof raw !== 'object') return {}
  const result: ExpenseCostDefaultsMap = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!(key in SYSTEM_CATEGORY_COST_DEFAULTS)) continue
    if (value === null) {
      result[key as ExpenseCategory] = null
      continue
    }
    if (value === 'PRODUCTION' || value === 'SELLING' || value === 'OVERHEAD') {
      result[key as ExpenseCategory] = value
    }
  }
  return result
}

export function resolveCategoryCostDefault(
  category: ExpenseCategory,
  userDefaults?: ExpenseCostDefaultsMap | null,
): ExpenseCostType | null {
  if (userDefaults && category in userDefaults) {
    return userDefaults[category] ?? null
  }
  return SYSTEM_CATEGORY_COST_DEFAULTS[category]
}

export function costTypeFromTransportSubcategory(
  subcategory: ExpenseSubcategory | null | undefined,
): ExpenseCostType | null {
  if (!subcategory) return null
  const match = TRANSPORT_SUBCATEGORIES.find((item) => item.value === subcategory)
  return match?.costType ?? null
}

export function suggestCostType(
  category: ExpenseCategory,
  subcategory?: ExpenseSubcategory | null,
  userDefaults?: ExpenseCostDefaultsMap | null,
): ExpenseCostType | null {
  if (category === 'TRANSPORT') {
    return costTypeFromTransportSubcategory(subcategory)
  }
  return resolveCategoryCostDefault(category, userDefaults)
}

export function expenseNeedsClassification(
  category: ExpenseCategory,
  costType: ExpenseCostType | null | undefined,
  subcategory?: ExpenseSubcategory | null,
): boolean {
  if (category === 'TRANSPORT') {
    return !subcategory || !costType
  }
  return !costType
}

export function costTypeLabel(costType: ExpenseCostType | null | undefined): string {
  if (!costType) return 'Needs Classification'
  return COST_TYPES.find((item) => item.value === costType)?.label ?? costType
}

export function subcategoryLabel(subcategory: ExpenseSubcategory | null | undefined): string {
  if (!subcategory) return ''
  return TRANSPORT_SUBCATEGORIES.find((item) => item.value === subcategory)?.label ?? subcategory
}

export function mergedCategoryCostDefaults(
  userDefaults?: ExpenseCostDefaultsMap | null,
): Record<ExpenseCategory, ExpenseCostType | null> {
  return {
    ...SYSTEM_CATEGORY_COST_DEFAULTS,
    ...(userDefaults ?? {}),
  }
}
