import {
  Banknote,
  Boxes,
  CreditCard,
  ReceiptText,
  TrendingUp,
  WalletCards,
} from 'lucide-react'

import { CsvExportButton } from '@/components/reports/csv-export-button'
import { ReportsDateRangeFilter } from '@/components/reports/reports-date-range-filter'
import { PageHeader } from '@/components/shared/page-header'
import { ReportCard } from '@/components/shared/report-card'
import { SummaryCard } from '@/components/shared/summary-card'
import { requireProfile } from '@/lib/auth'
import { formatDate } from '@/lib/dates'
import { expenseCategoryLabel, paymentStatusLabel } from '@/lib/labels'
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
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Reports"
        description={`Business performance for ${reports.range.label}.`}
      />

      <ReportsDateRangeFilter value={reports.range} />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Report summary">
        <SummaryCard label="Sales" value={<Money value={reports.summary.sales} currency={currency} />} icon={Banknote} tone="success" />
        <SummaryCard label="Expenses" value={<Money value={reports.summary.expenses} currency={currency} />} icon={ReceiptText} tone="warning" />
        <SummaryCard label="Gross Profit" value={<Money value={reports.summary.grossProfit} currency={currency} />} icon={TrendingUp} tone="success" />
        <SummaryCard label="Net Profit" value={<Money value={reports.summary.netProfit} currency={currency} />} icon={WalletCards} tone={reports.summary.netProfit >= 0 ? 'success' : 'danger'} />
        <SummaryCard label="Customer Receivables" value={<Money value={reports.summary.customerReceivables} currency={currency} />} icon={CreditCard} tone="warning" />
        <SummaryCard label="Stock Value" value={<Money value={reports.summary.stockValue} currency={currency} />} icon={Boxes} tone="info" />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <ReportCard title="Sales Report">
          <div className="grid grid-cols-3 gap-3 text-sm">
            <Metric label="Total sales" value={<Money value={reports.sales.totalSales} currency={currency} />} />
            <Metric label="Sales" value={reports.sales.count} />
            <Metric label="Average sale" value={<Money value={reports.sales.averageSale} currency={currency} />} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(reports.sales.byPaymentStatus).map(([status, count]) => (
              <Metric key={status} label={paymentStatusLabel(status as keyof typeof reports.sales.byPaymentStatus)} value={count} />
            ))}
          </div>
          <CsvExportButton
            filename="bizlite-sales-report.csv"
            rows={reports.sales.rows}
            columns={[
              { label: 'Invoice', value: (row) => row.invoiceNumber },
              { label: 'Date', value: (row) => row.date },
              { label: 'Customer', value: (row) => row.customer },
              { label: 'Total', value: (row) => row.totalAmount },
              { label: 'Paid', value: (row) => row.amountPaid },
              { label: 'Outstanding', value: (row) => row.balancePending },
              { label: 'Status', value: (row) => paymentStatusLabel(row.paymentStatus) },
            ]}
          />
        </ReportCard>

        <ReportCard title="Expense Report">
          <div className="grid grid-cols-3 gap-3 text-sm">
            <Metric label="Total" value={<Money value={reports.expenses.total} currency={currency} />} />
            <Metric label="Expenses" value={reports.expenses.count} />
            <Metric label="Average" value={<Money value={reports.expenses.average} currency={currency} />} />
          </div>
          <div className="space-y-2">
            {reports.expenses.byCategory.map((category) => (
              <div key={category.category} className="flex justify-between text-sm">
                <span>{expenseCategoryLabel(category.category as never)}</span>
                <Money value={category.total} currency={currency} />
              </div>
            ))}
          </div>
          <CsvExportButton
            filename="bizlite-expense-report.csv"
            rows={reports.expenses.rows}
            columns={[
              { label: 'Date', value: (row) => row.date },
              { label: 'Category', value: (row) => expenseCategoryLabel(row.category) },
              { label: 'Description', value: (row) => row.description },
              { label: 'Amount', value: (row) => row.amount },
            ]}
          />
        </ReportCard>
      </section>

      <ReportCard title="Profit Report">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Revenue" value={<Money value={reports.profit.revenue} currency={currency} />} />
          <Metric label="COGS" value={<Money value={reports.profit.cogs} currency={currency} />} />
          <Metric label="Gross profit" value={<Money value={reports.profit.grossProfit} currency={currency} />} />
          <Metric label="Operating expenses" value={<Money value={reports.profit.operatingExpenses} currency={currency} />} />
          <Metric label="Net profit" value={<Money value={reports.profit.netProfit} currency={currency} />} />
          <Metric label="Gross margin" value={`${reports.profit.grossMargin.toFixed(2)}%`} />
          <Metric label="Net margin" value={`${reports.profit.netMargin.toFixed(2)}%`} />
        </div>
        <CsvExportButton
          filename="bizlite-profit-report.csv"
          rows={[reports.profit]}
          columns={[
            { label: 'Revenue', value: (row) => row.revenue },
            { label: 'COGS', value: (row) => row.cogs },
            { label: 'Gross profit', value: (row) => row.grossProfit },
            { label: 'Operating expenses', value: (row) => row.operatingExpenses },
            { label: 'Net profit', value: (row) => row.netProfit },
            { label: 'Gross margin %', value: (row) => row.grossMargin },
            { label: 'Net margin %', value: (row) => row.netMargin },
          ]}
        />
      </ReportCard>

      <ReportTable
        title="Product Performance"
        exportButton={
          <CsvExportButton
            filename="bizlite-product-performance.csv"
            rows={reports.productPerformance}
            columns={[
              { label: 'Product', value: (row) => row.product },
              { label: 'Quantity sold', value: (row) => row.quantitySold },
              { label: 'Sales amount', value: (row) => row.salesAmount },
              { label: 'Cost', value: (row) => row.cost },
              { label: 'Gross profit', value: (row) => row.grossProfit },
              { label: 'Margin %', value: (row) => row.margin },
            ]}
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
            rows={reports.customerReceivables}
            columns={[
              { label: 'Customer', value: (row) => row.customer },
              { label: 'Total sales', value: (row) => row.totalSales },
              { label: 'Total paid', value: (row) => row.totalPaid },
              { label: 'Outstanding', value: (row) => row.outstanding },
              { label: 'Oldest pending sale', value: (row) => row.oldestPendingSaleDate },
            ]}
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
            rows={reports.inventory}
            columns={[
              { label: 'Product', value: (row) => row.product },
              { label: 'Current stock', value: (row) => row.currentStock },
              { label: 'Cost price', value: (row) => row.costPrice },
              { label: 'Selling price', value: (row) => row.sellingPrice },
              { label: 'Stock cost value', value: (row) => row.stockCostValue },
              { label: 'Potential selling value', value: (row) => row.potentialSellingValue },
              { label: 'Stock status', value: (row) => row.stockStatus },
            ]}
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
              {headers.map((header) => <th key={header} className="px-2 py-2 font-medium">{header}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${title}-${index}`} className="border-b last:border-0">
                {row.map((cell, cellIndex) => <td key={cellIndex} className="px-2 py-3">{cell}</td>)}
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
