import type { ExpenseCostType } from '@prisma/client'

import { costTypeLabel, isOperatingExpenseCostType } from '@/lib/expense-cost'
import { addMoney, money, moneyNumber, subMoney, type MoneyInput } from '@/lib/money'

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

export type DashboardCostingMode = 'INVENTORY' | 'SIMPLE'

export type DashboardTotalCostResult = {
  /** Total Cost = COGS + Operating Expenses */
  totalCost: number
  /** Sale-line COGS (INVENTORY) or PRODUCTION expense total (SIMPLE) */
  cogs: number
  operatingExpenses: number
  /** PRODUCTION expense ledger total (excluded from Total Cost in INVENTORY mode) */
  productionExpenseLedger: number
  sellingCost: number
  overheadCost: number
  unclassifiedExpenses: number
  /** Alias of `cogs` for older call sites */
  productionCost: number
  entryCount: number
  byCostType: CostShare[]
  byCategory: CostShare[]
  highestCategory: CostShare | null
  highestTransaction: DashboardCostExpenseRow | null
  recentEntries: DashboardCostExpenseRow[]
  validation: { ok: boolean; messages: string[] }
}

export type DashboardPnLReconciliation = {
  ok: boolean
  messages: string[]
  sales: number
  cogs: number
  operatingExpenses: number
  totalCost: number
  netProfit: number
  dateRangeLabel?: string
}

function shareAmount(amount: number, total: number): number {
  return total > 0 ? (amount / total) * 100 : 0
}

function roundMoney(value: number): number {
  return moneyNumber(money(value))
}

/**
 * Shared Total Cost for dashboard KPI, popup, and charts.
 *
 * Total Cost = COGS + Operating Expenses
 *
 * INVENTORY: COGS = sale-line unit-cost snapshots; PRODUCTION expenses that
 * create inventory are not added again (avoids double counting).
 * SIMPLE: COGS = PRODUCTION expense entries for the period.
 *
 * Operating expenses = SELLING + OVERHEAD + Unclassified.
 */
export function computeDashboardTotalCost(input: {
  costingMode: DashboardCostingMode
  /** Sum of sale.totalCost in the selected sale-date range */
  saleLineCogs: number
  expenses: DashboardCostExpenseRow[]
}): DashboardTotalCostResult {
  const unique = new Map<string, DashboardCostExpenseRow>()
  for (const row of input.expenses) unique.set(row.id, row)
  const entries = [...unique.values()].sort(
    (a, b) => b.date.getTime() - a.date.getTime() || moneyNumber(b.amount) - moneyNumber(a.amount),
  )

  const productionRows = entries.filter((row) => row.costType === 'PRODUCTION')
  const operatingRows = entries.filter((row) => isOperatingExpenseCostType(row.costType))

  const productionExpenseLedger = moneyNumber(addMoney(...productionRows.map((r) => r.amount)))
  const sellingCost = moneyNumber(
    addMoney(...entries.filter((r) => r.costType === 'SELLING').map((r) => r.amount)),
  )
  const overheadCost = moneyNumber(
    addMoney(...entries.filter((r) => r.costType === 'OVERHEAD').map((r) => r.amount)),
  )
  const unclassifiedExpenses = moneyNumber(
    addMoney(...entries.filter((r) => r.costType == null).map((r) => r.amount)),
  )
  const operatingExpenses = moneyNumber(addMoney(...operatingRows.map((r) => r.amount)))

  const cogs =
    input.costingMode === 'SIMPLE'
      ? productionExpenseLedger
      : roundMoney(Math.max(0, input.saleLineCogs))

  const totalCost = moneyNumber(addMoney(cogs, operatingExpenses))

  const byCostType: CostShare[] = [
    {
      key: 'COGS',
      name: 'COGS / Product Cost',
      amount: cogs,
      percent: shareAmount(cogs, totalCost),
    },
    {
      key: 'OPERATING',
      name: 'Operating Expenses',
      amount: operatingExpenses,
      percent: shareAmount(operatingExpenses, totalCost),
    },
  ]

  const byCategoryMap = new Map<string, number>()

  if (input.costingMode === 'INVENTORY') {
    if (cogs > 0) byCategoryMap.set('COGS / Product Cost', cogs)
    for (const row of operatingRows) {
      const name = row.category.name
      byCategoryMap.set(
        name,
        moneyNumber(money(byCategoryMap.get(name) || 0).plus(money(row.amount))),
      )
    }
  } else {
    // SIMPLE: explode production + operating categories (production = COGS)
    for (const row of [...productionRows, ...operatingRows]) {
      const name =
        row.costType === 'PRODUCTION' ? `COGS · ${row.category.name}` : row.category.name
      byCategoryMap.set(
        name,
        moneyNumber(money(byCategoryMap.get(name) || 0).plus(money(row.amount))),
      )
    }
    // If COGS exists but somehow no production rows (shouldn't), keep a fallback slice
    if (cogs > 0 && byCategoryMap.size === 0) {
      byCategoryMap.set('COGS / Product Cost', cogs)
    }
  }

  const byCategory = [...byCategoryMap.entries()]
    .map(([name, amount]) => ({
      key: name,
      name,
      amount,
      percent: shareAmount(amount, totalCost),
    }))
    .filter((row) => row.amount > 0)
    .sort((a, b) => b.amount - a.amount)

  const recentSource =
    input.costingMode === 'SIMPLE' ? [...productionRows, ...operatingRows] : operatingRows
  const highestTransaction =
    [...recentSource].sort((a, b) => moneyNumber(b.amount) - moneyNumber(a.amount))[0] ?? null

  const costTypeSum = moneyNumber(addMoney(...byCostType.map((r) => r.amount)))
  const categorySum = moneyNumber(addMoney(...byCategory.map((r) => r.amount)))
  const messages: string[] = []
  if (Math.abs(costTypeSum - totalCost) > 0.02) {
    messages.push(
      `COGS + Operating Expenses (${costTypeSum}) does not equal Total Cost (${totalCost}).`,
    )
  }
  if (byCategory.length > 0 && Math.abs(categorySum - totalCost) > 0.02) {
    messages.push(`Category amounts (${categorySum}) do not equal Total Cost (${totalCost}).`)
  }

  return {
    totalCost,
    cogs,
    operatingExpenses,
    productionExpenseLedger,
    sellingCost,
    overheadCost,
    unclassifiedExpenses,
    productionCost: cogs,
    entryCount: recentSource.length + (input.costingMode === 'INVENTORY' && cogs > 0 ? 1 : 0),
    byCostType,
    byCategory,
    highestCategory: byCategory[0] ?? null,
    highestTransaction,
    recentEntries: recentSource
      .sort(
        (a, b) =>
          b.date.getTime() - a.date.getTime() || moneyNumber(b.amount) - moneyNumber(a.amount),
      )
      .slice(0, 8),
    validation: { ok: messages.length === 0, messages },
  }
}

/** Net Profit = Sales − Total Cost; Total Cost = COGS + Operating Expenses */
export function reconcileDashboardPnL(input: {
  sales: number
  cogs: number
  operatingExpenses: number
  totalCost: number
  netProfit: number
  dateRangeLabel?: string
}): DashboardPnLReconciliation {
  const expectedTotal = moneyNumber(addMoney(input.cogs, input.operatingExpenses))
  const expectedNet = moneyNumber(subMoney(input.sales, expectedTotal))
  const messages: string[] = []

  if (Math.abs(input.totalCost - expectedTotal) > 0.02) {
    messages.push(
      `Displayed Total Cost ${input.totalCost} ≠ COGS ${input.cogs} + Operating ${input.operatingExpenses} (= ${expectedTotal})`,
    )
  }
  if (Math.abs(input.netProfit - expectedNet) > 0.02) {
    messages.push(
      `Displayed Net Profit ${input.netProfit} ≠ Sales ${input.sales} − Total Cost ${expectedTotal} (= ${expectedNet})`,
    )
  }

  const result: DashboardPnLReconciliation = {
    ok: messages.length === 0,
    messages,
    sales: input.sales,
    cogs: input.cogs,
    operatingExpenses: input.operatingExpenses,
    totalCost: input.totalCost,
    netProfit: input.netProfit,
    dateRangeLabel: input.dateRangeLabel,
  }

  if (!result.ok && process.env.NODE_ENV !== 'production') {
    console.warn('[dashboard] P&L reconciliation failed', {
      dateRange: input.dateRangeLabel,
      sales: input.sales,
      cogs: input.cogs,
      operatingExpenses: input.operatingExpenses,
      totalCost: input.totalCost,
      netProfit: input.netProfit,
      messages,
    })
  }

  return result
}

export function dashboardCostTypeLabel(costType: ExpenseCostType | null): string {
  if (costType == null) return 'Unclassified Expenses'
  return costTypeLabel(costType)
}
