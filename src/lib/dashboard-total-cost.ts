import type { ExpenseCostType } from '@prisma/client'

import { costTypeLabel } from '@/lib/expense-cost'
import { addMoney, money, moneyNumber, type MoneyInput } from '@/lib/money'

export type DashboardCostExpenseRow = {
  id: string
  date: Date
  amount: MoneyInput
  costType: ExpenseCostType | null
  category: { name: string }
  description: string
}

export type CostShare = {
  key: string
  name: string
  amount: number
  percent: number
}

export type DashboardTotalCostResult = {
  totalCost: number
  entryCount: number
  productionCost: number
  sellingCost: number
  overheadCost: number
  unclassifiedExpenses: number
  byCostType: CostShare[]
  byCategory: CostShare[]
  highestCategory: CostShare | null
  highestTransaction: DashboardCostExpenseRow | null
  recentEntries: DashboardCostExpenseRow[]
  validation: { ok: boolean; messages: string[] }
}

const COST_TYPE_ORDER: {
  key: 'PRODUCTION' | 'SELLING' | 'OVERHEAD' | 'UNCLASSIFIED'
  name: string
  match: (costType: ExpenseCostType | null) => boolean
}[] = [
  { key: 'PRODUCTION', name: 'Production Cost', match: (t) => t === 'PRODUCTION' },
  { key: 'SELLING', name: 'Selling Cost', match: (t) => t === 'SELLING' },
  { key: 'OVERHEAD', name: 'Overhead Cost', match: (t) => t === 'OVERHEAD' },
  { key: 'UNCLASSIFIED', name: 'Unclassified Expenses', match: (t) => t == null },
]

function shareAmount(amount: number, total: number): CostShare['percent'] {
  return total > 0 ? (amount / total) * 100 : 0
}

export function validateDashboardTotalCost(input: {
  totalCost: number
  entryCount: number
  rowTotal: number
  byCostType: CostShare[]
  byCategory: CostShare[]
  highestTransactionAmount: number
}): { ok: boolean; messages: string[] } {
  const messages: string[] = []
  if (Math.abs(input.totalCost - input.rowTotal) > 0.005) {
    messages.push(
      `Total Cost ${input.totalCost} does not equal sum of cost entries ${input.rowTotal}.`,
    )
  }
  if (input.highestTransactionAmount - input.totalCost > 0.005) {
    messages.push(
      `Highest transaction (${input.highestTransactionAmount}) exceeds Total Cost (${input.totalCost}).`,
    )
  }
  const costTypeSum = input.byCostType.reduce((sum, row) => sum + row.amount, 0)
  if (Math.abs(costTypeSum - input.totalCost) > 0.005) {
    messages.push(`Cost type amounts ${costTypeSum} do not equal Total Cost ${input.totalCost}.`)
  }
  const categorySum = input.byCategory.reduce((sum, row) => sum + row.amount, 0)
  if (Math.abs(categorySum - input.totalCost) > 0.005) {
    messages.push(`Category amounts ${categorySum} do not equal Total Cost ${input.totalCost}.`)
  }
  for (const row of [...input.byCostType, ...input.byCategory]) {
    if (row.percent - 100 > 0.05) {
      messages.push(`${row.name} percent ${row.percent} exceeds 100%.`)
    }
  }
  if (input.byCategory.length > 0 && input.totalCost > 0) {
    const pct = input.byCategory.reduce((sum, row) => sum + row.percent, 0)
    if (Math.abs(pct - 100) > 0.15) {
      messages.push(`Category percents total ${pct.toFixed(2)}% (expected ~100%).`)
    }
  }
  if (input.entryCount < 0) {
    messages.push('Entry count cannot be negative.')
  }
  return { ok: messages.length === 0, messages }
}

/**
 * Shared Total Cost for dashboard KPI, popup, and charts.
 * Includes Production + Selling + Overhead + Unclassified expense entries.
 * Does not use sale-line COGS and must not overwrite P&L Gross/Net Profit.
 */
export function computeDashboardTotalCost(
  rows: DashboardCostExpenseRow[],
): DashboardTotalCostResult {
  // Deduplicate by id so no expense is counted twice.
  const unique = new Map<string, DashboardCostExpenseRow>()
  for (const row of rows) unique.set(row.id, row)
  const entries = [...unique.values()].sort(
    (a, b) => b.date.getTime() - a.date.getTime() || moneyNumber(b.amount) - moneyNumber(a.amount),
  )

  const totalCost = moneyNumber(addMoney(...entries.map((row) => row.amount)))
  const productionCost = moneyNumber(
    addMoney(...entries.filter((row) => row.costType === 'PRODUCTION').map((row) => row.amount)),
  )
  const sellingCost = moneyNumber(
    addMoney(...entries.filter((row) => row.costType === 'SELLING').map((row) => row.amount)),
  )
  const overheadCost = moneyNumber(
    addMoney(...entries.filter((row) => row.costType === 'OVERHEAD').map((row) => row.amount)),
  )
  const unclassifiedExpenses = moneyNumber(
    addMoney(...entries.filter((row) => row.costType == null).map((row) => row.amount)),
  )

  const byCostType: CostShare[] = COST_TYPE_ORDER.map((def) => {
    const amount = moneyNumber(
      addMoney(...entries.filter((row) => def.match(row.costType)).map((row) => row.amount)),
    )
    return {
      key: def.key,
      name: def.name,
      amount,
      percent: shareAmount(amount, totalCost),
    }
  })

  const byCategoryMap = new Map<string, number>()
  for (const row of entries) {
    const name = row.category.name
    byCategoryMap.set(
      name,
      moneyNumber(money(byCategoryMap.get(name) || 0).plus(money(row.amount))),
    )
  }
  const byCategory = [...byCategoryMap.entries()]
    .map(([name, amount]) => ({
      key: name,
      name,
      amount,
      percent: shareAmount(amount, totalCost),
    }))
    .sort((a, b) => b.amount - a.amount)

  const highestCategory = byCategory[0] ?? null
  const highestTransaction =
    [...entries].sort((a, b) => moneyNumber(b.amount) - moneyNumber(a.amount))[0] ?? null

  const validation = validateDashboardTotalCost({
    totalCost,
    entryCount: entries.length,
    rowTotal: totalCost,
    byCostType,
    byCategory,
    highestTransactionAmount: highestTransaction ? moneyNumber(highestTransaction.amount) : 0,
  })

  return {
    totalCost,
    entryCount: entries.length,
    productionCost,
    sellingCost,
    overheadCost,
    unclassifiedExpenses,
    byCostType,
    byCategory,
    highestCategory,
    highestTransaction,
    recentEntries: entries.slice(0, 8),
    validation,
  }
}

export function dashboardCostTypeLabel(costType: ExpenseCostType | null): string {
  if (costType == null) return 'Unclassified Expenses'
  return costTypeLabel(costType)
}
