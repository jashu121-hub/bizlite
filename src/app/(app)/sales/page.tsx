import Link from 'next/link'
import { Plus } from 'lucide-react'
import type { PaymentStatus, Prisma } from '@prisma/client'
import { requireProfile } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getDateRange, prismaDateFilter, formatDate, type DateFilterPreset } from '@/lib/dates'
import { PAGE_SIZE } from '@/lib/constants'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { EmptyState } from '@/components/shared/empty-state'
import { UrlPagination } from '@/components/shared/url-pagination'
import { Button } from '@/components/ui/button'
import { SalesFilters } from './sales-filters'

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const params = await searchParams
  const { user, profile } = await requireProfile()
  const preset = (params.preset as DateFilterPreset) || 'month'
  const range = getDateRange(preset, params.from, params.to)
  const dateFilter = prismaDateFilter(range)
  const page = Math.max(1, Number(params.page) || 1)
  const q = params.q?.trim() || ''
  const status = params.status as PaymentStatus | undefined
  const customerId = params.customerId || undefined

  const where: Prisma.SaleWhereInput = {
    userId: user.id,
    ...(dateFilter ? { date: dateFilter } : {}),
    ...(status ? { paymentStatus: status } : {}),
    ...(customerId ? { customerId } : {}),
    ...(q
      ? {
          OR: [
            { invoiceNumber: { contains: q, mode: 'insensitive' } },
            { customer: { name: { contains: q, mode: 'insensitive' } } },
            { notes: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {}),
  }

  const [total, sales, customers] = await Promise.all([
    prisma.sale.count({ where }),
    prisma.sale.findMany({
      where,
      include: { customer: true },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.customer.findMany({
      where: { userId: user.id },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales"
        description={`Invoices for ${range.label}`}
        actions={
          <Button asChild>
            <Link href="/sales/new">
              <Plus className="h-4 w-4" />
              Add Sale
            </Link>
          </Button>
        }
      />

      <SalesFilters customers={customers} />

      {sales.length === 0 ? (
        <EmptyState
          icon={Plus}
          title="No sales found"
          description="Try clearing filters or add your first sale."
          action={
            <Button asChild>
              <Link href="/sales/new">Add Sale</Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {sales.map((sale) => (
              <Link
                key={sale.id}
                href={`/sales/${sale.id}`}
                className="block rounded-xl border bg-card p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{sale.invoiceNumber}</p>
                    <p className="text-sm text-muted-foreground">
                      {sale.customer?.name ?? 'Walk-in'} · {formatDate(sale.date)}
                    </p>
                    <div className="mt-2">
                      <StatusBadge status={sale.paymentStatus} />
                    </div>
                  </div>
                  <div className="text-right">
                    <CurrencyDisplay
                      value={sale.totalAmount}
                      currency={profile.currency}
                      className="font-bold"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Paid{' '}
                      <CurrencyDisplay value={sale.amountPaid} currency={profile.currency} />
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="hidden md:block overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Invoice</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium text-right">Total</th>
                  <th className="px-4 py-3 font-medium text-right">Paid</th>
                  <th className="px-4 py-3 font-medium text-right">Pending</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/sales/${sale.id}`} className="hover:underline">
                        {sale.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{formatDate(sale.date)}</td>
                    <td className="px-4 py-3">{sale.customer?.name ?? 'Walk-in'}</td>
                    <td className="px-4 py-3 text-right">
                      <CurrencyDisplay value={sale.totalAmount} currency={profile.currency} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <CurrencyDisplay value={sale.amountPaid} currency={profile.currency} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <CurrencyDisplay value={sale.balancePending} currency={profile.currency} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={sale.paymentStatus} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Link href={`/sales/${sale.id}`} className="text-primary hover:underline">
                          View
                        </Link>
                        <Link
                          href={`/sales/${sale.id}/edit`}
                          className="text-primary hover:underline"
                        >
                          Edit
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <UrlPagination page={page} pageSize={PAGE_SIZE} total={total} />
        </>
      )}
    </div>
  )
}
