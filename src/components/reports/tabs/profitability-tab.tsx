'use client'

import { useState } from 'react'

import { CompactMetricCard } from '@/components/reports/compact-metric-card'
import { ReportDataTable } from '@/components/reports/report-data-table'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatDate } from '@/lib/dates'
import { formatCurrency } from '@/lib/money'
import type { ReportsData } from '@/lib/types/reports'
import { cn } from '@/lib/utils'

type BreakdownKey = 'selling' | 'overhead' | 'unclassified' | 'operating' | 'cogs'

function Row({
  label,
  value,
  strong,
  tone,
  separator,
  onClick,
}: {
  label: string
  value: string
  strong?: boolean
  tone?: 'success' | 'danger' | 'muted'
  separator?: boolean
  onClick?: () => void
}) {
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-between gap-3 py-1.5 text-left text-sm',
        separator && 'mt-1 border-t border-zinc-200 pt-2',
        onClick &&
          'rounded-lg px-1 -mx-1 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600',
      )}
    >
      <span className={cn(strong ? 'font-medium text-zinc-900' : 'text-zinc-600')}>
        {label}
        {onClick ? <span className="ml-1 text-xs font-normal text-teal-700">View</span> : null}
      </span>
      <span
        className={cn(
          'tabular-nums',
          strong && 'font-semibold',
          tone === 'success' && 'text-emerald-600',
          tone === 'danger' && 'text-red-600',
          tone === 'muted' && 'text-zinc-600',
          !tone && 'text-zinc-900',
        )}
      >
        {value}
      </span>
    </Comp>
  )
}

export function ProfitabilityTab({
  data,
  currency,
  onViewAllProducts,
}: {
  data: ReportsData
  currency: string
  onViewAllProducts: () => void
}) {
  const [showAll, setShowAll] = useState(false)
  const [breakdown, setBreakdown] = useState<BreakdownKey | null>(null)
  const money = (value: number) => formatCurrency(value, currency)
  const p = data.profit
  const products = showAll ? data.productPerformance : data.productPerformance.slice(0, 5)

  const expenseBreakdownMeta: Record<
    Exclude<BreakdownKey, 'cogs'>,
    { title: string; total: number; rows: typeof p.expenseTransactions.selling }
  > = {
    selling: {
      title: 'Selling Cost',
      total: p.sellingCost,
      rows: p.expenseTransactions.selling,
    },
    overhead: {
      title: 'Overhead Cost',
      total: p.overheadCost,
      rows: p.expenseTransactions.overhead,
    },
    unclassified: {
      title: 'Unclassified Expenses',
      total: p.unclassifiedCost,
      rows: p.expenseTransactions.unclassified,
    },
    operating: {
      title: 'Operating Expenses',
      total: p.operatingExpenses,
      rows: p.expenseTransactions.operating,
    },
  }

  const activeExpenseBreakdown =
    breakdown && breakdown !== 'cogs' ? expenseBreakdownMeta[breakdown] : null
  const showCogs = breakdown === 'cogs'
  const productionExpensesTotal = p.productionExpenses ?? data.expenses.production.total
  const reconciliations = p.cogsReconciliation ?? []
  const productionExpenseAudit = p.productionExpenseAudit ?? []

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
        <CompactMetricCard
          label="Gross Profit"
          value={money(p.grossProfit)}
          tone={p.grossProfit >= 0 ? 'success' : 'danger'}
        />
        <CompactMetricCard
          label="Gross Margin"
          value={p.grossMargin === null ? '—' : `${p.grossMargin.toFixed(2)}%`}
          tone={(p.grossMargin ?? 0) >= 0 ? 'success' : 'danger'}
        />
        <CompactMetricCard
          label="Profit After Selling Costs"
          value={money(p.profitAfterSelling)}
          tone={p.profitAfterSelling >= 0 ? 'success' : 'danger'}
        />
        <CompactMetricCard
          label="Net Profit"
          value={money(p.netProfit)}
          tone={p.netProfit >= 0 ? 'success' : 'danger'}
        />
        <CompactMetricCard
          label="Net Margin"
          value={p.netMargin === null ? '—' : `${p.netMargin.toFixed(2)}%`}
          tone={(p.netMargin ?? 0) >= 0 ? 'success' : 'danger'}
        />
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-zinc-900">Profit and Loss</h3>
          <button
            type="button"
            className="text-xs font-medium text-teal-700 hover:underline"
            onClick={() => setBreakdown('operating')}
          >
            Operating Expenses {money(p.operatingExpenses)}
          </button>
        </div>
        <Row label="Sales Revenue" value={money(p.revenue)} />
        <Row
          label="Less: Production Cost (COGS)"
          value={money(p.productionCost)}
          tone="muted"
          onClick={() => setBreakdown('cogs')}
        />
        <Row
          label="Gross Profit"
          value={money(p.grossProfit)}
          strong
          separator
          tone={p.grossProfit >= 0 ? 'success' : 'danger'}
        />
        <Row
          label="Less: Selling Cost"
          value={money(p.sellingCost)}
          tone="muted"
          onClick={() => setBreakdown('selling')}
        />
        <Row
          label="Less: Overhead Cost"
          value={money(p.overheadCost)}
          tone="muted"
          onClick={() => setBreakdown('overhead')}
        />
        <Row
          label="Less: Unclassified Expenses"
          value={money(p.unclassifiedCost)}
          tone="muted"
          onClick={() => setBreakdown('unclassified')}
        />
        <Row
          label="Net Profit"
          value={money(p.netProfit)}
          strong
          separator
          tone={p.netProfit >= 0 ? 'success' : 'danger'}
        />
        <p className="mt-3 text-xs text-zinc-500">
          Production Cost (COGS) = quantity sold × unit cost saved on each sale line. Entered
          PRODUCTION expenses ({money(productionExpensesTotal)}) are a separate expense-ledger total
          and are not automatically the same as COGS. Unclassified Expenses only include transactions
          with no cost classification. Net Profit = Gross Profit − Selling − Overhead − Unclassified.
        </p>
        {process.env.NODE_ENV === 'development' && p.reconciliation && !p.reconciliation.ok ? (
          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Reconciliation warning: {p.reconciliation.messages.join(' ')}
          </p>
        ) : null}
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-zinc-900">Product Profitability</h3>
          {data.productPerformance.length > 5 ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                if (showAll) onViewAllProducts()
                else setShowAll(true)
              }}
            >
              {showAll ? 'Open Products tab' : 'View All Products'}
            </Button>
          ) : null}
        </div>
        <ReportDataTable
          headers={[
            { key: 'product', label: 'Product' },
            { key: 'qty', label: 'Qty Sold', align: 'right' },
            { key: 'sales', label: 'Sales', align: 'right' },
            { key: 'cogs', label: 'Cost of Goods Sold', align: 'right' },
            { key: 'gp', label: 'Gross Profit', align: 'right' },
            { key: 'margin', label: 'Margin', align: 'right' },
          ]}
          rows={products.map((row) => ({
            key: row.product,
            cells: [
              row.product,
              row.quantitySold,
              money(row.salesAmount),
              money(row.cost),
              <span
                key="gp"
                className={cn(row.grossProfit >= 0 ? 'text-emerald-600' : 'text-red-600')}
              >
                {money(row.grossProfit)}
              </span>,
              `${row.margin.toFixed(2)}%`,
            ],
          }))}
          emptyMessage="No product sales for this period."
        />
      </section>

      <Dialog open={breakdown !== null} onOpenChange={(open) => !open && setBreakdown(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {showCogs ? 'COGS reconciliation' : activeExpenseBreakdown?.title}
            </DialogTitle>
            <DialogDescription>
              {data.range.label} ·{' '}
              {money(showCogs ? p.productionCost : (activeExpenseBreakdown?.total ?? 0))}
            </DialogDescription>
          </DialogHeader>
          {showCogs ? (
            <div className="space-y-5">
              <p className="text-xs text-zinc-500">
                COGS uses inventory Method B: quantity sold × sale-time unit cost snapshot. Entered
                PRODUCTION expenses ({money(productionExpensesTotal)}) are listed separately below
                and are not added on top of COGS unless they also appear in the product cost
                calculator that created the unit cost.
              </p>

              {reconciliations.length === 0 ? (
                <p className="text-sm text-zinc-500">No sale lines in this period.</p>
              ) : (
                reconciliations.map((row) => {
                  const componentTotal = row.components.reduce((sum, c) => sum + c.soldAmount, 0)
                  const extraVsMaterialsExpense =
                    productionExpensesTotal > 0
                      ? row.lineCogs - productionExpensesTotal
                      : null
                  return (
                    <div
                      key={row.productId}
                      className="space-y-3 rounded-xl border border-zinc-200 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-zinc-900">{row.productName}</p>
                          <p className="text-xs text-zinc-500">
                            Qty sold {row.quantitySold} × sale-time unit cost {money(row.saleTimeUnitCost)}{' '}
                            = {money(row.lineCogs)} COGS
                          </p>
                          {row.catalogUnitCost != null ? (
                            <p className="text-[11px] text-zinc-400">
                              Catalog costPrice: {money(row.catalogUnitCost)}
                              {row.inventoryCostPerUnitFromBreakdown != null
                                ? ` · Cost calculator inventory/unit: ${money(row.inventoryCostPerUnitFromBreakdown)}`
                                : ''}
                            </p>
                          ) : null}
                        </div>
                        <p className="shrink-0 text-sm font-semibold tabular-nums text-zinc-900">
                          {money(row.lineCogs)}
                        </p>
                      </div>

                      {row.components.length > 0 ? (
                        <div>
                          <p className="mb-1 text-xs font-medium text-zinc-700">
                            Cost components in AED {row.saleTimeUnitCost.toFixed(2)} unit cost
                            {row.productionBatchQuantity
                              ? ` (from production batch of ${row.productionBatchQuantity})`
                              : ''}
                          </p>
                          <ul className="space-y-1">
                            {row.components.map((c) => (
                              <li
                                key={c.key}
                                className="flex items-center justify-between gap-2 text-xs text-zinc-600"
                              >
                                <span>
                                  {c.label}
                                  <span className="text-zinc-400">
                                    {' '}
                                    · batch {money(c.batchAmount)} → {money(c.perUnitAmount)}/unit
                                  </span>
                                </span>
                                <span className="tabular-nums text-zinc-900">
                                  {money(c.soldAmount)}
                                </span>
                              </li>
                            ))}
                            <li className="flex items-center justify-between gap-2 border-t border-zinc-100 pt-1 text-xs font-medium text-zinc-900">
                              <span>Components for qty sold</span>
                              <span className="tabular-nums">{money(componentTotal)}</span>
                            </li>
                          </ul>
                          {row.componentsExplainUnitCost ? (
                            <p className="mt-2 text-[11px] text-emerald-700">
                              Supported by Product.costBreakdown: inventory cost/unit matches the
                              sale-time unit cost. Non-materials production components in the
                              calculator explain why unit cost can exceed materials alone — this is
                              separate from any PRODUCTION expense total in the expense ledger.
                            </p>
                          ) : (
                            <p className="mt-2 text-[11px] text-amber-800">
                              Cost calculator inventory/unit does not match the sale-time unit cost.
                              Review the product cost calculator and sale-line snapshot.
                            </p>
                          )}
                          {extraVsMaterialsExpense != null && Math.abs(extraVsMaterialsExpense) > 0.005 ? (
                            <p className="mt-1 text-[11px] text-zinc-500">
                              Difference vs period PRODUCTION expense total ({money(productionExpensesTotal)}):{' '}
                              {money(extraVsMaterialsExpense)}. These are different accounting measures
                              unless the expense amount is also the materials line in costBreakdown.
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <p className="text-xs text-amber-800">
                          No Product.costBreakdown components found for this product. Unit cost may
                          come only from catalog costPrice / sale snapshot.
                        </p>
                      )}

                      {row.inventory ? (
                        <div>
                          <p className="mb-1 text-xs font-medium text-zinc-700">
                            Inventory quantity movements (units — not a monetary ledger)
                          </p>
                          <div className="grid grid-cols-2 gap-1 text-xs text-zinc-600 sm:grid-cols-4">
                            <p>Opening: {row.inventory.openingStock}</p>
                            <p>Stock added: {row.inventory.stockAdded}</p>
                            <p>Sold (movements): {row.inventory.stockSold}</p>
                            <p>Current: {row.inventory.currentStock}</p>
                          </div>
                          <p className="mt-1 text-[11px] text-zinc-400">
                            Monetary identity Opening + Purchases − Closing = COGS is not fully
                            available: stock movements do not store unit cost, and PRODUCTION
                            expenses do not post to an inventory asset account.
                          </p>
                          {row.inventory.movements.length > 0 ? (
                            <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto">
                              {row.inventory.movements.map((m) => (
                                <li key={m.id} className="text-[11px] text-zinc-500">
                                  {formatDate(m.date)} · {m.type} · {m.quantity > 0 ? '+' : ''}
                                  {m.quantity}
                                  {m.notes ? ` · ${m.notes}` : ''}
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  )
                })
              )}

              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                <p className="text-xs font-medium text-amber-950">
                  Period PRODUCTION expense audit ({money(productionExpensesTotal)})
                </p>
                <p className="mt-1 text-[11px] text-amber-900">
                  These rows are expense records. They are not proven inventory capitalization unless
                  cash/bank is reduced and Raw Materials / WIP / Finished Goods inventory is
                  increased. They enter P&amp;L as COGS only when their cost is included in the
                  product unit cost and the product is sold.
                </p>
                {productionExpenseAudit.length === 0 ? (
                  <p className="mt-2 text-xs text-amber-800">No PRODUCTION expenses in this period.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {productionExpenseAudit.map((expense) => (
                      <li
                        key={expense.id}
                        className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-zinc-900">
                              {expense.description || expense.category}
                            </p>
                            <p className="text-zinc-500">
                              {formatDate(expense.date)} · {expense.category}
                            </p>
                            <p className="mt-1 text-[11px] text-zinc-500">{expense.note}</p>
                            <p className="mt-1 text-[11px] text-zinc-500">
                              Cash/bank ledger link:{' '}
                              {expense.hasCashLedgerLink ? expense.cashAccountId : 'none'}
                              {' · '}
                              Linked to product: no · Creates stock movement: no
                            </p>
                          </div>
                          <p className="shrink-0 font-semibold tabular-nums text-zinc-900">
                            {money(expense.amount)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {(p.cogsBreakdown ?? []).length > 0 ? (
                <div>
                  <p className="mb-2 text-xs font-medium text-zinc-700">Sale-line detail</p>
                  <ul className="space-y-2">
                    {p.cogsBreakdown.map((row, index) => (
                      <li
                        key={`${row.saleId ?? 'sale'}-${row.productId ?? row.productName}-${index}`}
                        className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium text-zinc-900">{row.productName}</p>
                            <p className="text-xs text-zinc-500">
                              {row.invoiceNumber ?? 'Sale'}
                              {row.date ? ` · ${formatDate(row.date)}` : ''} · Qty {row.quantity} ×{' '}
                              {money(row.unitCost)}
                            </p>
                            <p className="mt-0.5 text-[10px] text-zinc-400">
                              {row.source === 'unitCostSnapshot'
                                ? 'Source: sale-line unit cost snapshot'
                                : row.source === 'lineCostFallback'
                                  ? 'Source: legacy line cost fallback'
                                  : 'Source: no cost snapshot'}
                            </p>
                          </div>
                          <p className="shrink-0 tabular-nums font-semibold text-zinc-900">
                            {money(row.lineCogs)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : activeExpenseBreakdown && activeExpenseBreakdown.rows.length === 0 ? (
            <p className="text-sm text-zinc-500">No expense transactions in this group.</p>
          ) : (
            <ul className="space-y-2">
              {activeExpenseBreakdown?.rows.map((row) => (
                <li
                  key={row.id}
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-zinc-900">{row.description || row.category}</p>
                      <p className="text-xs text-zinc-500">
                        {formatDate(row.date)} · {row.category}
                        {row.vendor ? ` · ${row.vendor}` : ''}
                      </p>
                      <p className="mt-0.5 font-mono text-[10px] text-zinc-400">{row.id}</p>
                    </div>
                    <p className="shrink-0 tabular-nums font-semibold text-zinc-900">
                      {money(row.amount)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
