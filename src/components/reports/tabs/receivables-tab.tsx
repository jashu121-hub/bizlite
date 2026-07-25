'use client'

import Link from 'next/link'

import { CompactMetricCard } from '@/components/reports/compact-metric-card'
import { ReportDataTable } from '@/components/reports/report-data-table'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/dates'
import { formatCurrency } from '@/lib/money'
import type { ReportsData } from '@/lib/types/reports'
import { cn } from '@/lib/utils'

export function ReceivablesTab({ data, currency }: { data: ReportsData; currency: string }) {
  const money = (value: number) => formatCurrency(value, currency)
  const summary = data.receivablesSummary

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <CompactMetricCard
          label="Total Receivables"
          value={money(summary.total)}
          tone="warning"
        />
        <CompactMetricCard label="Number of Customers" value={summary.customers} />
        <CompactMetricCard
          label="Overdue Amount"
          value={money(summary.overdueAmount)}
          tone={summary.overdueAmount > 0 ? 'danger' : 'default'}
        />
        <CompactMetricCard
          label="Oldest Pending Invoice"
          value={
            summary.oldestPendingSaleDate ? formatDate(summary.oldestPendingSaleDate) : '—'
          }
        />
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <ReportDataTable
          headers={[
            { key: 'customer', label: 'Customer' },
            { key: 'sales', label: 'Total Sales', align: 'right' },
            { key: 'paid', label: 'Total Paid', align: 'right' },
            { key: 'out', label: 'Outstanding', align: 'right' },
            { key: 'oldest', label: 'Oldest Pending' },
            { key: 'status', label: 'Status' },
            { key: 'action', label: 'Action' },
          ]}
          rows={data.customerReceivables.map((row) => ({
            key: row.customerId,
            cells: [
              row.customer,
              money(row.totalSales),
              money(row.totalPaid),
              money(row.outstanding),
              formatDate(row.oldestPendingSaleDate),
              <StatusBadge key="st" status={row.status} />,
              <Button key="a" asChild size="sm" variant="outline">
                <Link href={`/customers/${row.customerId}`}>View</Link>
              </Button>,
            ],
          }))}
          emptyMessage="No outstanding receivables."
        />
      </section>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === 'Overdue'
      ? 'bg-red-50 text-red-700'
      : status === 'Due Soon'
        ? 'bg-amber-50 text-amber-800'
        : status === 'Partially Paid'
          ? 'bg-teal-50 text-teal-700'
          : 'bg-zinc-100 text-zinc-700'
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', tone)}>{status}</span>
  )
}
