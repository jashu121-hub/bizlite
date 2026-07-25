import {
  Banknote,
  Boxes,
  CreditCard,
  ReceiptText,
  TrendingUp,
  WalletCards,
} from 'lucide-react'

import { CsvExportButton } from '@/components/reports/csv-export-button'
import { ExpenseCostReport } from '@/components/reports/expense-cost-report'
import { ProfitWaterfall } from '@/components/reports/profit-waterfall'
import { ReportsDateRangeFilter } from '@/components/reports/reports-date-range-filter'
import { PageHeader } from '@/components/shared/page-header'
import { ReportCard } from '@/components/shared/report-card'
import { SummaryCard } from '@/components/shared/summary-card'
import { requireProfile } from '@/lib/auth'
import { formatDate } from '@/lib/dates'
import { paymentStatusLabel } from '@/lib/labels'
import { formatCurrency } from '@/lib/money'
import { getReportsData } from '@/lib/queries/reports'
import type { DateFilterPreset } from '@/lib/dates'

const validPresets: DateFilterPreset[] = ['month', 'ytd', 'year', 'lifetime', 'custom']

function isPreset(value: string | undefined): value is DateFilterPreset {
  return Boolean(value && validPresets.includes(value as DateFilterPreset))
}

function Money({ value, currency }: { value: number; currency: string }) {
  return <span className="tabular-nums">{formatCurrency(value, currency)}</span>
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>
}) {
  const params = await searchParams
  const preset = isPreset(params.range) ? params.range : 'month'
  const { user, profile } = await requireProfile()
  const reports = await getReportsData(user.id, preset, params.from, params.to)
  const currency = profile.currency

  return (
    <main className="w-full min-w-0 max-w-none space-y-6">
      <PageHeader
        title="Reports"
        description={`Business performance for ${reports.range.label}.`}
      />

      <ReportsDateRangeFilter
        value={{
          preset: reports.range.preset,
          label: reports.range.label,
          from: reports.range.from ? reports.range.from.toISOString().slice(0, 10) : null,
          to: reports.range.to ? reports.range.to.toISOString().slice(0, 10) : null,
        }}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Report summary">
        <SummaryCard
          label="Sales"
          value={<Money value={reports.summary.sales} currency={currency} />}
          icon={Banknote}
          tone="success"
        />
        <SummaryCard
          label="Expenses"
          value={<Money value={reports.summary.expenses} currency={currency} />}
          icon={ReceiptText}
          tone="warning"
        />
        <SummaryCard
          label="Gross Profit"
          value={<Money value={reports.summary.grossProfit} currency={currency} />}
          icon={TrendingUp}
          tone={reports.summary.grossProfit >= 0 ? 'success' : 'danger'}
          hint="Sales − Production Cost"
        />
        <SummaryCard
          label="Net Profit"
          value={<Money value={reports.summary.netProfit} currency={currency} />}
          icon={WalletCards}
          tone={reports.summary.netProfit >= 0 ? 'success' : 'danger'}
          hint="After selling & overhead"
        />
        <SummaryCard
          label="Customer Receivables"
          value={<Money value={reports.summary.customerReceivables} currency={currency} />}
          icon={CreditCard}
          tone="warning"
        />
        <SummaryCard
          label="Stock Value"
          value={<Money value={reports.summary.stockValue} currency={currency} />}
          icon={Boxes}
          tone="info"
        />
      </section>

      <ReportCard title="Sales Report">
        <div className="grid grid-cols-3 gap-3 text-sm">
          <Metric
            label="Total sales"
            value={<Money value={reports.sales.totalSales} currency={currency} />}
          />
          <Metric label="Sales" value={reports.sales.count} />
          <Metric
            label="Average sale"
            value={<Money value={reports.sales.averageSale} currency={currency} />}
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {Object.entries(reports.sales.byPaymentStatus).map(([status, count]) => (
            <Metric
              key={status}
              label={paymentStatusLabel(status as keyof typeof reports.sales.byPaymentStatus)}
              value={count}
            />
          ))}
        </div>
        <CsvExportButton
          filename="bizlite-sales-report.csv"
          headers={[
            'Invoice',
            'Date',
            'Customer',
            'Total',
            'Paid',
            'Outstanding',
            'Status',
          ]}
          rows={reports.sales.rows.map((row) => [
            row.invoiceNumber,
            formatDate(row.date),
            row.customer,
            row.totalAmount,
            row.amountPaid,
            row.balancePending,
            paymentStatusLabel(row.paymentStatus),
          ])}
        />
      </ReportCard>

      <section aria-label="Expense cost report">
        <h2 className="mb-3 text-lg font-semibold text-zinc-900">Expense Report</h2>
        <ExpenseCostReport
          currency={currency}
          expenses={reports.expenses}
          profit={reports.profit}
        />
      </section>

      <ProfitWaterfall currency={currency} profit={reports.profit} />

      <ReportTable
        title="Product Performance"
        exportButton={
          <CsvExportButton
            filename="bizlite-product-performance.csv"
            headers={[
              'Product',
              'Quantity sold',
              'Sales amount',
              'Cost',
              'Gross profit',
              'Margin %',
            ]}
            rows={reports.productPerformance.map((row) => [
              row.product,
              row.quantitySold,
              row.salesAmount,
              row.cost,
              row.grossProfit,
              row.margin,
            ])}
          />
        }
        headers={['Product', 'Qty Sold', 'Sales', 'Cost', 'Gross Profit', 'Margin']}
        rows={reports.productPerformance.map((row) => [
          row.product,
          row.quantitySold,
          <Money key="sales" value={row.salesAmount} currency={currency} />,
          <Money key="cost" value={row.cost} currency={currency} />,
          <Money key="profit" value={row.grossProfit} currency={currency} />,
          `${row.margin.toFixed(2)}%`,
        ])}
      />

      <ReportTable
        title="Customer Receivables"
        exportButton={
          <CsvExportButton
            filename="bizlite-customer-receivables.csv"
            headers={[
              'Customer',
              'Total sales',
              'Total paid',
              'Outstanding',
              'Oldest pending sale',
            ]}
            rows={reports.customerReceivables.map((row) => [
              row.customer,
              row.totalSales,
              row.totalPaid,
              row.outstanding,
              formatDate(row.oldestPendingSaleDate),
            ])}
          />
        }
        headers={['Customer', 'Total Sales', 'Total Paid', 'Outstanding', 'Oldest Pending']}
        rows={reports.customerReceivables.map((row) => [
          row.customer,
          <Money key="sales" value={row.totalSales} currency={currency} />,
          <Money key="paid" value={row.totalPaid} currency={currency} />,
          <Money key="outstanding" value={row.outstanding} currency={currency} />,
          formatDate(row.oldestPendingSaleDate),
        ])}
      />

      <ReportTable
        title="Inventory"
        exportButton={
          <CsvExportButton
            filename="bizlite-inventory-report.csv"
            headers={[
              'Product',
              'Current stock',
              'Cost price',
              'Selling price',
              'Stock cost value',
              'Potential selling value',
              'Stock status',
            ]}
            rows={reports.inventory.map((row) => [
              row.product,
              row.currentStock,
              row.costPrice,
              row.sellingPrice,
              row.stockCostValue,
              row.potentialSellingValue,
              row.stockStatus,
            ])}
          />
        }
        headers={['Product', 'Stock', 'Cost', 'Selling', 'Stock Value', 'Potential Value', 'Status']}
        rows={reports.inventory.map((row) => [
          row.product,
          row.currentStock,
          <Money key="cost" value={row.costPrice} currency={currency} />,
          <Money key="selling" value={row.sellingPrice} currency={currency} />,
          <Money key="stock-value" value={row.stockCostValue} currency={currency} />,
          <Money key="selling-value" value={row.potentialSellingValue} currency={currency} />,
          row.stockStatus,
        ])}
      />
    </main>
  )
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900/50">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-1 font-semibold text-zinc-900 dark:text-zinc-50">{value}</p>
    </div>
  )
}

function ReportTable({
  title,
  headers,
  rows,
  exportButton,
}: {
  title: string
  headers: string[]
  rows: React.ReactNode[][]
  exportButton: React.ReactNode
}) {
  return (
    <ReportCard title={title}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-sm">
          <thead>
            <tr className="border-b text-left text-zinc-500 dark:text-zinc-400">
              {headers.map((header) => (
                <th key={header} className="px-2 py-2 font-medium">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${title}-${index}`} className="border-b last:border-0">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-2 py-3">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 ? <p className="text-sm text-zinc-500">No data for this report.</p> : null}
      {exportButton}
    </ReportCard>
  )
}
