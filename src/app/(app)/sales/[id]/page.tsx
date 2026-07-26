import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { requireProfile } from '@/lib/auth'
import { PageHeader } from '@/components/shared/page-header'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { StatusBadge } from '@/components/shared/status-badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { APP_NAME } from '@/lib/constants'
import { formatDate } from '@/lib/dates'
export default async function SalePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user, profile } = await requireProfile()
  const s = await prisma.sale.findFirst({
    where: { id, userId: user.id },
    include: {
      customer: true,
      items: { include: { product: { select: { name: true } } } },
      payments: true,
    },
  })
  if (!s) notFound()
  const businessName = profile.businessName?.trim()
  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <PageHeader
          title={s.invoiceNumber}
          description={`${formatDate(s.date)} · ${s.customer?.name ?? 'Walk-in customer'}`}
          actions={
            <Button asChild variant="outline">
              <Link href={`/sales/${id}/edit`}>Edit</Link>
            </Button>
          }
        />
      </div>
      <Card className="print:border-0 print:shadow-none">
        <CardContent className="p-6">
          <div className="mb-6 flex justify-between">
            <div>
              {businessName ? (
                <p className="mb-1 text-sm font-medium text-teal-800">{businessName}</p>
              ) : null}
              <h1 className="text-2xl font-bold">Invoice {s.invoiceNumber}</h1>
              <p>{formatDate(s.date)}</p>
            </div>
            <StatusBadge status={s.paymentStatus} />
          </div>
          <div className="space-y-3">
            {s.items.map((i) => (
              <div key={i.id} className="flex justify-between border-b pb-2">
                <span>
                  {i.product?.name ?? i.productName} × {i.quantity}
                </span>
                <CurrencyDisplay value={i.lineTotal} currency={profile.currency} />
              </div>
            ))}
          </div>
          <div className="mt-5 space-y-1 text-right">
            <p>
              Discount: <CurrencyDisplay value={s.discount} currency={profile.currency} />
            </p>
            <p className="text-xl font-bold">
              Total: <CurrencyDisplay value={s.totalAmount} currency={profile.currency} />
            </p>
            <p>
              Paid: <CurrencyDisplay value={s.amountPaid} currency={profile.currency} />
            </p>
            <p>
              Balance: <CurrencyDisplay value={s.balancePending} currency={profile.currency} />
            </p>
          </div>
          <p className="mt-8 text-center text-xs text-zinc-400">Generated using {APP_NAME}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-5">
          <h2 className="mb-3 font-semibold">Payment history</h2>
          {s.payments.length ? (
            s.payments.map((p) => (
              <p key={p.id} className="border-b py-2">
                {formatDate(p.date)} · <CurrencyDisplay value={p.amount} currency={profile.currency} />
              </p>
            ))
          ) : (
            <p className="text-sm text-zinc-500">No payments recorded.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
