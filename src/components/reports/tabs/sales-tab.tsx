'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { PaymentStatus } from '@prisma/client'

import { CompactMetricCard } from '@/components/reports/compact-metric-card'
import { ReportDataTable } from '@/components/reports/report-data-table'
import { formatDate } from '@/lib/dates'
import { paymentStatusLabel } from '@/lib/labels'
import { formatCurrency } from '@/lib/money'
import type { ReportsData } from '@/lib/types/reports'

export function SalesTab({ data, currency }: { data: ReportsData; currency: string }) {
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'ALL'>('ALL')
  const money = (value: number) => formatCurrency(value, currency)

  const rows = useMemo(() => {
    const filtered =
      statusFilter === 'ALL'
        ? data.sales.rows
        : data.sales.rows.filter((row) => row.paymentStatus === statusFilter)
    return filtered.map((row) => ({
      key: row.id,
      cells: [
        <Link key="inv" href={`/sales/${row.id}`} className="font-medium text-teal-700 hover:underline">
          {row.invoiceNumber}
        </Link>,
        formatDate(row.date),
        row.customer,
        money(row.totalAmount),
        money(row.amountPaid),
        money(row.balancePending),
        paymentStatusLabel(row.paymentStatus),
      ],
    }))
  }, [data.sales.rows, statusFilter, currency])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        <CompactMetricCard label="Total Sales" value={money(data.sales.totalSales)} />
        <CompactMetricCard label="Number of Sales" value={data.sales.count} />
        <CompactMetricCard label="Average Sale" value={money(data.sales.averageSale)} />
        <CompactMetricCard
          label="Paid"
          value={data.sales.byPaymentStatus.PAID}
          active={statusFilter === 'PAID'}
          tone="success"
          onClick={() => setStatusFilter((s) => (s === 'PAID' ? 'ALL' : 'PAID'))}
        />
        <CompactMetricCard
          label="Partial"
          value={data.sales.byPaymentStatus.PARTIALLY_PAID}
          active={statusFilter === 'PARTIALLY_PAID'}
          tone="warning"
          onClick={() =>
            setStatusFilter((s) => (s === 'PARTIALLY_PAID' ? 'ALL' : 'PARTIALLY_PAID'))
          }
        />
        <CompactMetricCard
          label="Pending"
          value={data.sales.byPaymentStatus.PENDING}
          active={statusFilter === 'PENDING'}
          tone="danger"
          onClick={() => setStatusFilter((s) => (s === 'PENDING' ? 'ALL' : 'PENDING'))}
        />
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-zinc-900">Sales</h3>
          {statusFilter !== 'ALL' ? (
            <button
              type="button"
              className="text-xs font-medium text-teal-700 hover:underline"
              onClick={() => setStatusFilter('ALL')}
            >
              Clear filter
            </button>
          ) : null}
        </div>
        <ReportDataTable
          headers={[
            { key: 'invoice', label: 'Invoice' },
            { key: 'date', label: 'Date' },
            { key: 'customer', label: 'Customer' },
            { key: 'total', label: 'Total', align: 'right' },
            { key: 'paid', label: 'Paid', align: 'right' },
            { key: 'out', label: 'Outstanding', align: 'right' },
            { key: 'status', label: 'Status' },
          ]}
          rows={rows}
          emptyMessage="No sales found for this period."
        />
      </section>
    </div>
  )
}
