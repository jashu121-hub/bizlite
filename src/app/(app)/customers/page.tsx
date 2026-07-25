import Link from 'next/link'
import { Plus } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requireProfile } from '@/lib/auth'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { CustomersTable } from './customers-table'

export default async function CustomersPage() {
  const { user, profile } = await requireProfile()
  const customers = await prisma.customer.findMany({
    where: { userId: user.id },
    include: { sales: { select: { balancePending: true } } },
    orderBy: { name: 'asc' },
  })

  const rows = customers.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email,
    outstanding: c.sales.reduce((sum, sale) => sum + Number(sale.balancePending), 0),
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
