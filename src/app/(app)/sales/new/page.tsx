import { prisma } from '@/lib/prisma'
import { requireProfile } from '@/lib/auth'
import { PageHeader } from '@/components/shared/page-header'
import { SalesForm } from '../sales-form'

export default async function NewSalePage() {
  const { user, profile } = await requireProfile()
  const [products, customers, cashAccounts] = await Promise.all([
    prisma.product.findMany({
      where: { userId: user.id, isActive: true },
      select: {
        id: true,
        name: true,
        sku: true,
        currentStock: true,
        sellingPrice: true,
      },
      orderBy: { name: 'asc' },
    }),
    prisma.customer.findMany({
      where: { userId: user.id },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.cashAccount.findMany({
      where: { userId: user.id, isActive: true },
      select: { id: true, name: true, type: true },
      orderBy: { name: 'asc' },
    }),
  ])

  return (
    <div className="space-y-6">
      <PageHeader title="New sale" description="Create a sale and update stock." />
      <SalesForm
        products={products.map((product) => ({
          ...product,
          sellingPrice: product.sellingPrice.toString(),
        }))}
        customers={customers}
        cashAccounts={cashAccounts}
        currency={profile.currency}
      />
    </div>
  )
}
