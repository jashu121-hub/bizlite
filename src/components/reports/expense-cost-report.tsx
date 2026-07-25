'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

import { CsvExportButton } from '@/components/reports/csv-export-button'
import { ReportCard } from '@/components/shared/report-card'
import { SummaryCard } from '@/components/shared/summary-card'
import { formatCurrency } from '@/lib/money'
import {
  expenseCategoryLabel,
  expenseCostTypeLabel,
  expenseSubcategoryLabel,
  paymentMethodLabel,
} from '@/lib/labels'
import { formatDate } from '@/lib/dates'
import { cn } from '@/lib/utils'

type BreakdownRow = {
  key: string
  label: string
  amount: number
  percentOfGroup: number
  percentOfTotal: number
}

type CostGroup = {
  total: number
  percentOfTotal: number
  breakdown: BreakdownRow[]
}

type ExpenseRow = {
  date: Date | string
  category: string
  costType: string | null
  subcategory: string | null
  description: string
  amount: number
  paymentMethod: string
  vendor: string | null
  reference: string | null
  notes: string | null
  needsClassification: boolean
}

export function ExpenseCostReport({
  currency,
  expenses,
  profit,
}: {
  currency: string
  expenses: {
    total: number
    count: number
    average: number
    production: CostGroup
    selling: CostGroup
    overhead: CostGroup
    unclassifiedTotal: number
    needsClassificationCount: number
    rows: ExpenseRow[]
  }
  profit: {
    revenue: number
    productionCost: number
    grossProfit: number
    sellingCost: number
    profitAfterSelling: number
    overheadCost: number
    netProfit: number
    grossMargin: number | null
    netMargin: number | null
  }
}) {
  const money = (value: number) => formatCurrency(value, currency)

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryCard
          label="Total Expenses"
          value={money(expenses.total)}
          hint={
            expenses.unclassifiedTotal > 0
              ? `${money(expenses.production.total + expenses.selling.total + expenses.overhead.total)} classified · ${money(expenses.unclassifiedTotal)} needs classification`
              : `Production + Selling + Overhead = ${money(expenses.total)}`
          }
          tone="warning"
        />
        <SummaryCard
          label="Production Cost"
          value={money(expenses.production.total)}
          hint={`${expenses.production.percentOfTotal.toFixed(1)}% of total expenses`}
          tone="info"
        />
        <SummaryCard
          label="Selling Cost"
          value={money(expenses.selling.total)}
          hint={`${expenses.selling.percentOfTotal.toFixed(1)}% of total expenses`}
          tone="default"
        />
        <SummaryCard
          label="Overhead Cost"
          value={money(expenses.overhead.total)}
          hint={`${expenses.overhead.percentOfTotal.toFixed(1)}% of total expenses`}
          tone="default"
        />
        <SummaryCard label="Number of Expenses" value={expenses.count} tone="default" />
        <SummaryCard
          label="Average Expense"
          value={money(expenses.average)}
          tone="default"
        />
      </div>

      {expenses.needsClassificationCount > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {expenses.needsClassificationCount} expense
          {expenses.needsClassificationCount === 1 ? '' : 's'} need classification
          {expenses.unclassifiedTotal > 0
            ? ` (${money(expenses.unclassifiedTotal)} unclassified).`
            : '.'}{' '}
          Edit transport expenses and choose Inward, Customer Delivery, or General Transport.
        </div>
      ) : null}

      <ReportCard title="Expense Cost Breakdown">
        <CostBreakdownSection
          title="Production Cost Breakdown"
          group={expenses.production}
          currency={currency}
          defaultOpen
        />
        <CostBreakdownSection
          title="Selling Cost Breakdown"
          group={expenses.selling}
          currency={currency}
        />
        <CostBreakdownSection
          title="Overhead Cost Breakdown"
          group={expenses.overhead}
          currency={currency}
        />

        <CsvExportButton
          filename="bizlite-expense-report.csv"
          headers={[
            'Date',
            'Category',
            'Cost Type',
            'Subcategory',
            'Description',
            'Amount',
            'Payment method',
            'Reference',
            'Vendor',
          ]}
          rows={expenses.rows.map((row) => [
            formatDate(row.date),
            expenseCategoryLabel(row.category as never),
            expenseCostTypeLabel(row.costType as never),
            expenseSubcategoryLabel(row.subcategory as never),
            row.description,
            row.amount,
            paymentMethodLabel(row.paymentMethod as never),
            row.reference ?? '',
            row.vendor ?? '',
          ])}
          appendRows={[
            [],
            ['Cost summary'],
            ['Production Cost', expenses.production.total],
            ['Selling Cost', expenses.selling.total],
            ['Overhead Cost', expenses.overhead.total],
            ['Total Expenses', expenses.total],
            ['Gross Profit', profit.grossProfit],
            ['Net Profit', profit.netProfit],
          ]}
        />
      </ReportCard>
    </div>
  )
}

function CostBreakdownSection({
  title,
  group,
  currency,
  defaultOpen = false,
}: {
  title: string
  group: CostGroup
  currency: string
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="rounded-xl border border-zinc-200">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <div>
          <p className="text-sm font-semibold text-zinc-900">{title}</p>
          <p className="text-xs text-zinc-500">
            {formatCurrency(group.total, currency)} · {group.percentOfTotal.toFixed(1)}% of
            total
          </p>
        </div>
        <ChevronDown
          className={cn('h-4 w-4 text-zinc-500 transition-transform', open && 'rotate-180')}
        />
      </button>
      {open ? (
        <div className="space-y-2 border-t border-zinc-100 px-4 py-3">
          {group.breakdown.length === 0 ? (
            <p className="text-sm text-zinc-500">No expenses in this group for the period.</p>
          ) : (
            group.breakdown.map((row) => (
              <div
                key={row.key}
                className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="text-zinc-700">{row.label}</span>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 sm:justify-end">
                  <span className="font-semibold tabular-nums text-zinc-900">
                    {formatCurrency(row.amount, currency)}
                  </span>
                  <span>{row.percentOfGroup.toFixed(1)}% of group</span>
                  <span>{row.percentOfTotal.toFixed(1)}% of total</span>
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}
