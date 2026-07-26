'use client'

import { Download } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { APP_NAME } from '@/lib/constants'
import { formatDate } from '@/lib/dates'
import {
  expenseCostTypeLabel,
  paymentMethodLabel,
  paymentStatusLabel,
} from '@/lib/labels'
import type { ReportsData } from '@/lib/types/reports'

const EXPORT_PREFIX = 'bizlite-2026'

type CsvValue = string | number | null | undefined

function csvCell(value: CsvValue): string {
  const text = value === null || value === undefined ? '' : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

function downloadCsv(filename: string, lines: string[]) {
  const url = URL.createObjectURL(
    new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function tableCsv(headers: string[], rows: CsvValue[][]) {
  return [
    headers.map(csvCell).join(','),
    ...rows.map((row) => row.map(csvCell).join(',')),
  ]
}

export function ExportReportMenu({
  data,
  currency,
}: {
  data: ReportsData
  currency: string
}) {
  const exportSales = () =>
    downloadCsv(
      `${EXPORT_PREFIX}-sales-report.csv`,
      tableCsv(
        ['Invoice', 'Date', 'Customer', 'Total', 'Paid', 'Outstanding', 'Status'],
        data.sales.rows.map((row) => [
          row.invoiceNumber,
          formatDate(row.date),
          row.customer,
          row.totalAmount,
          row.amountPaid,
          row.balancePending,
          paymentStatusLabel(row.paymentStatus),
        ]),
      ),
    )

  const exportExpenses = () =>
    downloadCsv(
      `${EXPORT_PREFIX}-expense-report.csv`,
      [
        ...tableCsv(
          [
            'Date',
            'Category',
            'Cost Type',
            'Description',
            'Amount',
            'Payment method',
            'Reference',
            'Vendor',
          ],
          data.expenses.rows.map((row) => [
            formatDate(row.date),
            row.categoryName ?? row.category,
            expenseCostTypeLabel(row.costType as never),
            row.description,
            row.amount,
            paymentMethodLabel(row.paymentMethod as never),
            row.reference ?? '',
            row.vendor ?? '',
          ]),
        ),
        '',
        csvCell('Cost summary'),
        [csvCell('Production Cost'), csvCell(data.expenses.production.total)].join(','),
        [csvCell('Selling Cost'), csvCell(data.expenses.selling.total)].join(','),
        [csvCell('Overhead Cost'), csvCell(data.expenses.overhead.total)].join(','),
        [csvCell('Unclassified Cost'), csvCell(data.expenses.unclassifiedTotal)].join(','),
        [csvCell('Total Expenses'), csvCell(data.expenses.total)].join(','),
        [csvCell('Gross Profit'), csvCell(data.profit.grossProfit)].join(','),
        [csvCell('Net Profit'), csvCell(data.profit.netProfit)].join(','),
      ],
    )

  const exportProfit = () =>
    downloadCsv(
      `${EXPORT_PREFIX}-profit-report.csv`,
      tableCsv(
        [
          'Sales Revenue',
          'Production Cost',
          'Gross Profit',
          'Selling Cost',
          'Overhead Cost',
          'Unclassified Cost',
          'Net Profit',
          'Gross Margin %',
          'Net Margin %',
        ],
        [
          [
            data.profit.revenue,
            data.profit.productionCost,
            data.profit.grossProfit,
            data.profit.sellingCost,
            data.profit.overheadCost,
            data.profit.unclassifiedCost,
            data.profit.netProfit,
            data.profit.grossMargin ?? '',
            data.profit.netMargin ?? '',
          ],
        ],
      ),
    )

  const exportProducts = () =>
    downloadCsv(
      `${EXPORT_PREFIX}-product-performance.csv`,
      tableCsv(
        ['Product', 'Quantity sold', 'Revenue', 'Cost', 'Gross profit', 'Margin %', 'Status'],
        data.productPerformance.map((row) => [
          row.product,
          row.quantitySold,
          row.salesAmount,
          row.cost,
          row.grossProfit,
          row.margin,
          row.status,
        ]),
      ),
    )

  const exportReceivables = () =>
    downloadCsv(
      `${EXPORT_PREFIX}-customer-receivables.csv`,
      tableCsv(
        ['Customer', 'Total sales', 'Total paid', 'Outstanding', 'Oldest pending', 'Status'],
        data.customerReceivables.map((row) => [
          row.customer,
          row.totalSales,
          row.totalPaid,
          row.outstanding,
          formatDate(row.oldestPendingSaleDate),
          row.status,
        ]),
      ),
    )

  const exportInventory = () =>
    downloadCsv(
      `${EXPORT_PREFIX}-inventory-report.csv`,
      tableCsv(
        [
          'Product',
          'Current stock',
          'Average unit cost',
          'Selling price',
          'Stock value',
          'Potential sales value',
          'Potential gross profit',
          'Status',
          'Active',
        ],
        data.inventory.rows.map((row) => [
          row.product,
          row.currentStock,
          row.costPrice,
          row.sellingPrice,
          row.stockCostValue,
          row.potentialSellingValue,
          row.potentialGrossProfit,
          row.stockStatus,
          row.isActive ? 'Yes' : 'Archived',
        ]),
      ),
    )

  const exportComplete = () => {
    const lines = [
      csvCell(`${APP_NAME} Complete Report (${currency})`),
      csvCell(`Period: ${data.range.label}`),
      csvCell(`Generated using ${APP_NAME}`),
      '',
      csvCell('=== Sales ==='),
      ...tableCsv(
        ['Invoice', 'Date', 'Customer', 'Total', 'Paid', 'Outstanding', 'Status'],
        data.sales.rows.map((row) => [
          row.invoiceNumber,
          formatDate(row.date),
          row.customer,
          row.totalAmount,
          row.amountPaid,
          row.balancePending,
          paymentStatusLabel(row.paymentStatus),
        ]),
      ),
      '',
      csvCell('=== Expenses ==='),
      ...tableCsv(
        ['Date', 'Category', 'Cost Type', 'Amount', 'Description'],
        data.expenses.rows.map((row) => [
          formatDate(row.date),
          row.categoryName ?? row.category,
          expenseCostTypeLabel(row.costType as never),
          row.amount,
          row.description,
        ]),
      ),
      '',
      csvCell('=== Profit ==='),
      ...tableCsv(
        ['Metric', 'Amount'],
        [
          ['Sales Revenue', data.profit.revenue],
          ['Production Cost', data.profit.productionCost],
          ['Gross Profit', data.profit.grossProfit],
          ['Selling Cost', data.profit.sellingCost],
          ['Overhead Cost', data.profit.overheadCost],
          ['Unclassified Cost', data.profit.unclassifiedCost],
          ['Net Profit', data.profit.netProfit],
        ],
      ),
    ]
    downloadCsv(`${EXPORT_PREFIX}-complete-report.csv`, lines)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-1.5">
          <Download className="h-4 w-4" />
          Export Report
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={exportComplete}>Export Complete Report</DropdownMenuItem>
        <DropdownMenuItem onClick={exportSales}>Export Sales Report</DropdownMenuItem>
        <DropdownMenuItem onClick={exportExpenses}>Export Expense Report</DropdownMenuItem>
        <DropdownMenuItem onClick={exportProfit}>Export Profit Report</DropdownMenuItem>
        <DropdownMenuItem onClick={exportProducts}>Export Product Performance</DropdownMenuItem>
        <DropdownMenuItem onClick={exportReceivables}>Export Receivables</DropdownMenuItem>
        <DropdownMenuItem onClick={exportInventory}>Export Inventory</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
