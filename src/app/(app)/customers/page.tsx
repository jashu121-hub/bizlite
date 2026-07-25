import Link from 'next/link'
import { Plus } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requireProfile } from '@/lib/auth'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { CustomersTable } from './customers-table'
import { moneyNumber } from '@/lib/money'

export default async function CustomersPage() {
  const { user, profile } = await requireProfile()
  const [customers, outstandingByCustomer] = await Promise.all([
    prisma.customer.findMany({
      where: { userId: user.id },
      select: { id: true, name: true, phone: true, email: true },
      orderBy: { name: 'asc' },
    }),
    prisma.sale.groupBy({
      by: ['customerId'],
      where: { userId: user.id, customerId: { not: null }, balancePending: { gt: 0 } },
      _sum: { balancePending: true },
    }),
  ])

  const outstandingMap = new Map(
    outstandingByCustomer.map((row) => [
      row.customerId!,
      moneyNumber(row._sum.balancePending || 0),
    ]),
  )

  const rows = customers.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email,
    outstanding: outstandingMap.get(c.id) ?? 0,
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Manage customers and outstanding balances."
        actions={
          <Button asChild>
            <Link href="/customers/new">
              <Plus /> New customer
            </Link>
          </Button>
        }
      />
      <CustomersTable customers={rows} currency={profile.currency} />
    </div>
  )
}
