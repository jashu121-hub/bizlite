import type { ExpenseCostType, ExpenseLedgerKind } from '@prisma/client'
import type { ExpenseCategoryDTO } from './expense-categories'

export type CostTypeKey = ExpenseCostType
export type LedgerKindKey = ExpenseLedgerKind

/** @deprecated Categories now carry their own defaults. */
export type ExpenseCostDefaultsMap = Partial<Record<string, ExpenseCostType | null>>
/** @deprecated Legacy profile defaults are ignored. */
export function parseExpenseCostDefaults(_raw: unknown): ExpenseCostDefaultsMap {
  return {}
}
/** @deprecated Use category defaults. */
export function mergedCategoryCostDefaults(
  defaults?: ExpenseCostDefaultsMap | null,
): Record<string, ExpenseCostType | null> {
  return { ...(defaults ?? {}) } as Record<string, ExpenseCostType | null>
}

export const COST_TYPES = [
  { value: 'PRODUCTION' as const, label: 'Production Cost' },
  { value: 'SELLING' as const, label: 'Selling Cost' },
  { value: 'OVERHEAD' as const, label: 'Overhead Cost' },
]

export const EXPENSE_LEDGER_KINDS = [
  {
    value: 'OPERATING' as const,
    label: 'Operating Expense',
    help: 'Period costs that do not create inventory. Reduces net profit immediately.',
  },
  {
    value: 'INVENTORY_PURCHASE' as const,
    label: 'Inventory Purchase',
    help: 'Use Purchase Stock instead. Inventory increases; cost becomes COGS when sold.',
  },
  {
    value: 'PRODUCTION_PAYMENT' as const,
    label: 'Production Payment',
    help: 'Cash/bank or payable for a production batch. Not an operating expense.',
  },
  {
    value: 'ASSET_PURCHASE' as const,
    label: 'Asset Purchase',
    help: 'Capital / asset purchase. Not a normal operating expense.',
  },
]

export function suggestCostType(
  category: Pick<ExpenseCategoryDTO, 'defaultCostType'> | null | undefined,
) {
  return category?.defaultCostType ?? null
}

export function expenseNeedsClassification(
  costType: ExpenseCostType | null | undefined,
  ledgerKind: ExpenseLedgerKind | string | null | undefined = 'OPERATING',
): boolean {
  if (ledgerKind && ledgerKind !== 'OPERATING') return false
  return !costType
}

/** True when the expense row should reduce net profit immediately. */
export function isOperatingExpense(expense: {
  costType?: ExpenseCostType | null
  ledgerKind?: ExpenseLedgerKind | string | null
}): boolean {
  const kind = expense.ledgerKind ?? 'OPERATING'
  if (kind !== 'OPERATING') return false
  return (
    expense.costType == null ||
    expense.costType === 'SELLING' ||
    expense.costType === 'OVERHEAD'
  )
}

/**
 * @deprecated Prefer isOperatingExpense({ costType, ledgerKind }).
 * Kept for call sites that only have costType (treats as OPERATING ledger).
 */
export function isOperatingExpenseCostType(
  costType: ExpenseCostType | null | undefined,
): boolean {
  return costType == null || costType === 'SELLING' || costType === 'OVERHEAD'
}

/** SIMPLE-mode period COGS: legacy PRODUCTION operating rows only — never PRODUCTION_PAYMENT. */
export function isSimpleModeCogsExpense(expense: {
  costType?: ExpenseCostType | null
  ledgerKind?: ExpenseLedgerKind | string | null
}): boolean {
  const kind = expense.ledgerKind ?? 'OPERATING'
  return kind === 'OPERATING' && expense.costType === 'PRODUCTION'
}

export function costTypeLabel(costType: ExpenseCostType | null | undefined): string {
  if (!costType) return 'Needs Classification'
  return COST_TYPES.find((item) => item.value === costType)?.label ?? costType
}

export function ledgerKindLabel(kind: ExpenseLedgerKind | string | null | undefined): string {
  if (!kind) return 'Operating Expense'
  return EXPENSE_LEDGER_KINDS.find((item) => item.value === kind)?.label ?? String(kind)
}
