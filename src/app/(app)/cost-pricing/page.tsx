import { prisma } from '@/lib/prisma'
import { requireProfile } from '@/lib/auth'
import { CostPricingWorkspace } from '@/components/cost-pricing/cost-pricing-workspace'

export default async function CostPricingPage() {
  const { user, profile } = await requireProfile()

  const [products, calculations, expenseCategories, cashAccounts] = await Promise.all([
    prisma.product.findMany({
      where: { userId: user.id, isActive: true },
      select: {
        id: true,
        name: true,
        category: true,
        sku: true,
        currentStock: true,
        costPrice: true,
        sellingPrice: true,
      },
      orderBy: { name: 'asc' },
    }),
    prisma.productCostCalculation.findMany({
      where: { userId: user.id },
      orderBy: [{ calculationDate: 'desc' }, { updatedAt: 'desc' }],
      include: { product: { select: { id: true, name: true } } },
      take: 100,
    }),
    prisma.expenseCategoryItem.findMany({
      where: { userId: user.id, isArchived: false, parentId: null },
      select: { id: true, name: true, defaultCostType: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    }),
    prisma.cashAccount.findMany({
      where: { userId: user.id, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  return (
    <CostPricingWorkspace
      currency={profile.currency}
      products={products.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        sku: p.sku,
        currentStock: p.currentStock,
        costPrice: p.costPrice.toString(),
        sellingPrice: p.sellingPrice.toString(),
      }))}
      initialHistory={calculations.map((r) => ({
        id: r.id,
        name: r.name,
        productId: r.productId,
        productName: r.product?.name ?? null,
        quantity: r.quantity,
        unit: r.unit,
        calculationDate: r.calculationDate.toISOString().slice(0, 10),
        status: r.status,
        totalBatchCost: r.totalBatchCost.toString(),
        costPerUnit: r.costPerUnit.toString(),
        suggestedSellingPrice: r.suggestedSellingPrice.toString(),
        grossMarginPct: r.grossMarginPct.toString(),
        expenseIds: r.expenseIds,
        updatedAt: r.updatedAt.toISOString(),
      }))}
      expenseCategories={expenseCategories.map((c) => ({
        id: c.id,
        name: c.name,
        defaultCostType: c.defaultCostType,
      }))}
      cashAccounts={cashAccounts}
    />
  )
}
