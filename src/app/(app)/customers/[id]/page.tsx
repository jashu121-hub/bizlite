import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CreditCard, Pencil, Plus, ShoppingBag } from 'lucide-react'
import { requireProfile } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { addMoney, moneyNumber } from '@/lib/money'
import { formatDate } from '@/lib/dates'
import { PageHeader } from '@/components/shared/page-header'
import { SummaryCard } from '@/components/shared/summary-card'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { StatusBadge } from '@/components/shared/status-badge'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDeleteCustomer } from './customer-actions'
import { RecordPaymentDialog } from './record-payment-dialog'

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { user, profile } = await requireProfile()
  const customer = await prisma.customer.findFirst({
    where: { id, userId: user.id },
    include: {
      sales: {
        orderBy: { date: 'desc' },
        include: { items: true },
      },
      payments: {
        orderBy: { date: 'desc' },
      },
    },
  })
  if (!customer) notFound()

  const totalSales = moneyNumber(addMoney(...customer.sales.map((s) => s.totalAmount)))
  const totalPaid = moneyNumber(addMoney(...customer.sales.map((s) => s.amountPaid)))
  const pending = moneyNumber(addMoney(...customer.sales.map((s) => s.balancePending)))
  const pendingSales = customer.sales.filter((s) => moneyNumber(s.balancePending) > 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title={customer.name}
        description={[customer.phone, customer.email, customer.address].filter(Boolean).join(' · ') || 'Customer details'}
        actions={
          <div className="flex flex-wrap gap-2">
            <RecordPaymentDialog
              customerId={customer.id}
              currency={profile.currency}
              pendingSales={pendingSales.map((s) => ({
                id: s.id,
                invoiceNumber: s.invoiceNumber,
                balancePending: moneyNumber(s.balancePending),
              }))}
            />
            <Button asChild variant="outline">
              <Link href={`/customers/${customer.id}/edit`}>
                <Pencil className="h-4 w-4" />
                Edit
              </Link>
            </Button>
            <ConfirmDeleteCustomer id={customer.id} />
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard label="Total sales" value={<CurrencyDisplay value={totalSales} currency={profile.currency} />} />
        <SummaryCard label="Total paid" value={<CurrencyDisplay value={totalPaid} currency={profile.currency} />} />
        <SummaryCard label="Pending balance" value={<CurrencyDisplay value={pending} currency={profile.currency} />} tone={pending > 0 ? 'warning' : 'default'} />
        <SummaryCard label="Number of sales" value={String(customer.sales.length)} />
      </div>

      {customer.notes ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{customer.notes}</CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Sales history</CardTitle>
          <Button asChild size="sm" variant="outline">
            <Link href="/sales/new">
              <Plus className="h-4 w-4" />
              Add sale
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {customer.sales.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title="No sales yet"
              description="Sales linked to this customer will appear here."
            />
          ) : (
            <ul className="divide-y divide-border">
              {customer.sales.map((sale) => (
                <li key={sale.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link href={`/sales/${sale.id}`} className="font-medium hover:underline">
                      {sale.invoiceNumber}
                    </Link>
                    <p className="text-xs text-muted-foreground">{formatDate(sale.date)}</p>
                    <div className="mt-1">
                      <StatusBadge status={sale.paymentStatus} />
                    </div>
                  </div>
                  <CurrencyDisplay value={sale.totalAmount} currency={profile.currency} className="font-semibold" />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment history</CardTitle>
        </CardHeader>
        <CardContent>
          {customer.payments.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="No payments yet"
              description="Record a payment to reduce outstanding balances."
            />
          ) : (
            <ul className="divide-y divide-border">
              {customer.payments.map((payment) => (
                <li key={payment.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div>
                    <p className="font-medium">{formatDate(payment.date)}</p>
                    <p className="text-xs text-muted-foreground">
                      {payment.saleId ? 'Linked to sale' : 'Unallocated'} · {payment.paymentMethod.replaceAll('_', ' ')}
                    </p>
                  </div>
                  <CurrencyDisplay value={payment.amount} currency={profile.currency} className="font-semibold text-emerald-600" />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
