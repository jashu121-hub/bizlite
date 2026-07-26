import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { requireProfile } from '@/lib/auth'
import { PageHeader } from '@/components/shared/page-header'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ProductActions } from './product-actions'
import { stockStatus } from '@/lib/labels'

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { user, profile } = await requireProfile()
  const p = await prisma.product.findFirst({
    where: { id, userId: user.id },
    include: { stockMovements: { orderBy: { date: 'desc' }, take: 20 } },
  })
  if (!p) notFound()

  const data = {
    name: p.name,
    category: p.category,
    sku: p.sku ?? '',
    productType: p.productType,
    unitOfMeasure: p.unitOfMeasure,
    costPrice: p.costPrice.toString(),
    defaultPurchaseCost: p.defaultPurchaseCost.toString(),
    standardProductionCost: p.standardProductionCost.toString(),
    sellingPrice: p.sellingPrice.toString(),
    openingStock: p.openingStock,
    currentStock: p.currentStock,
    lowStockLevel: p.lowStockLevel,
    notes: p.notes ?? '',
    isActive: p.isActive,
  }

  const isService = p.productType === 'SERVICE'

  return (
    <div className="space-y-6">
      <PageHeader
        title={p.name}
        description={`${p.category}${p.sku ? ` · ${p.sku}` : ''} · ${p.productType}`}
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href={`/products/${id}/edit`}>Edit</Link>
            </Button>
            <ProductActions id={id} data={data} />
          </div>
        }
      />
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-zinc-500">{isService ? 'Type' : 'Stock'}</p>
            <p className="text-2xl font-bold">{isService ? 'Service' : p.currentStock}</p>
            {isService ? null : (
              <p className="text-sm">{stockStatus(p.currentStock, p.lowStockLevel)}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-zinc-500">Default selling price</p>
            <CurrencyDisplay
              className="text-2xl font-bold"
              value={p.sellingPrice}
              currency={profile.currency}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-zinc-500">
              {isService ? 'Direct service cost' : 'Current inventory cost'}
            </p>
            <CurrencyDisplay
              className="text-2xl font-bold"
              value={p.costPrice}
              currency={profile.currency}
            />
          </CardContent>
        </Card>
      </div>
      {isService ? null : (
        <Card>
          <CardContent className="p-5">
            <h2 className="mb-4 font-semibold">Stock history</h2>
            <div className="space-y-3">
              {p.stockMovements.map((m) => (
                <div key={m.id} className="flex justify-between border-b pb-2 text-sm">
                  <span>
                    {m.type.replaceAll('_', ' ')}
                    {m.notes ? ` · ${m.notes}` : ''}
                    {m.unitCost != null
                      ? ` · @ ${m.unitCost.toString()}`
                      : ''}
                  </span>
                  <strong className={m.quantity >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                    {m.quantity >= 0 ? '+' : ''}
                    {m.quantity}
                  </strong>
                </div>
              ))}
              {!p.stockMovements.length && (
                <p className="text-sm text-zinc-500">No stock movements yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
