import type { ExpenseCostType } from '@prisma/client'
import type { ExpenseCategoryDTO } from './expense-categories'

export type CostTypeKey = ExpenseCostType
/** @deprecated Categories now carry their own defaults. */
export type ExpenseCostDefaultsMap = Partial<Record<string, ExpenseCostType | null>>
/** @deprecated Legacy profile defaults are ignored. */
export function parseExpenseCostDefaults(_raw: unknown): ExpenseCostDefaultsMap { return {} }
/** @deprecated Use category defaults. */
export function mergedCategoryCostDefaults(defaults?: ExpenseCostDefaultsMap | null): Record<string, ExpenseCostType | null> {
  return { ...(defaults ?? {}) } as Record<string, ExpenseCostType | null>
}

export const COST_TYPES = [
  { value: 'PRODUCTION' as const, label: 'Production Cost' },
  { value: 'SELLING' as const, label: 'Selling Cost' },
  { value: 'OVERHEAD' as const, label: 'Overhead Cost' },
]

export function suggestCostType(category: Pick<ExpenseCategoryDTO, 'defaultCostType'> | null | undefined) {
  return category?.defaultCostType ?? null
}

export function expenseNeedsClassification(costType: ExpenseCostType | null | undefined): boolean {
  return !costType
}

/** P&L operating expenses: Selling + Overhead + Unclassified. Excludes PRODUCTION / inventory / COGS. */
export function isOperatingExpenseCostType(
  costType: ExpenseCostType | null | undefined,
): boolean {
  return costType == null || costType === 'SELLING' || costType === 'OVERHEAD'
}

export function costTypeLabel(costType: ExpenseCostType | null | undefined): string {
  if (!costType) return 'Needs Classification'
  return COST_TYPES.find((item) => item.value === costType)?.label ?? costType
}

