'use client'

import { useEffect, useMemo, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { addStockAction } from '@/actions/products'
import { ProductModalShell } from '@/app/(app)/products/product-modal-shell'
import type { ProductRow } from '@/app/(app)/products/products-table'
import { ProductCostCalculator } from '@/components/products/product-cost-calculator'
import { CurrencyInput } from '@/components/shared/currency-input'
import { NumberInput } from '@/components/shared/number-input'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { todayInputValue } from '@/lib/dates'
import { formatCurrency, money } from '@/lib/money'
import {
  normalizeCostBreakdown,
  weightedAverageCost,
  type ProductCostBreakdown,
} from '@/lib/product-cost'
import { addStockSchema, type AddStockInput } from '@/lib/validations/product'

export function AddStockModal({
  product,
  currency,
  open,
  onOpenChange,
}: {
  product: ProductRow | null
  currency: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const form = useForm<any>({
    resolver: zodResolver(addStockSchema),
    defaultValues: {
      productId: '',
      quantity: 1,
      date: todayInputValue(),
      purchaseCost: '',
      supplier: '',
      reference: '',
      notes: '',
      costBreakdown: null,
    },
  })

  useEffect(() => {
    if (product && open) {
      form.reset({
        productId: product.id,
        quantity: 1,
        date: todayInputValue(),
        purchaseCost: '',
        supplier: '',
        reference: '',
        notes: '',
        costBreakdown: null,
      })
    }
  }, [product, open, form])

  const quantity = Number(form.watch('quantity')) || 0
  const purchaseCost = form.watch('purchaseCost') as string
  const costBreakdown = form.watch('costBreakdown') as ProductCostBreakdown | null
  const preview = useMemo(
    () => (product ? product.currentStock + Math.max(0, quantity) : 0),
    [product, quantity],
  )

  const batchUnitCost = useMemo(() => {
    if (costBreakdown && money(costBreakdown.totalProductionCost).gt(0)) {
      return costBreakdown.inventoryCostPerUnit
    }
    if (purchaseCost && money(purchaseCost).gt(0)) return money(purchaseCost).toFixed(2)
    return null
  }, [costBreakdown, purchaseCost])

  const weightedPreview = useMemo(() => {
    if (!product || !batchUnitCost || quantity <= 0) return null
    return weightedAverageCost(
      product.currentStock,
      product.costPrice,
      quantity,
      batchUnitCost,
    )
  }, [product, batchUnitCost, quantity])

  if (!product) return null

  return (
    <ProductModalShell
      open={open}
      onOpenChange={onOpenChange}
      title="Add Stock"
      description={`Increase inventory for ${product.name}`}
      wide
    >
      <form
        className="space-y-4"
        onSubmit={form.handleSubmit((data: AddStockInput) =>
          startTransition(async () => {
            const payload: AddStockInput = {
              ...data,
              costBreakdown: data.costBreakdown
                ? normalizeCostBreakdown(data.costBreakdown as ProductCostBreakdown)
                : null,
            }
            const result = await addStockAction(payload)
            if (!result.success) {
              toast.error(result.error)
              return
            }
            toast.success(result.message ?? 'Stock added')
            onOpenChange(false)
            router.refresh()
          }),
        )}
      >
        <input type="hidden" {...form.register('productId')} />
        <div className="rounded-xl bg-zinc-50 px-3 py-3 text-sm">
          <p className="font-semibold text-zinc-900">{product.name}</p>
          {product.sku ? <p className="text-zinc-500">SKU: {product.sku}</p> : null}
          <p className="mt-1 text-zinc-600">
            Current stock: {product.currentStock} · Cost:{' '}
            {formatCurrency(product.costPrice, currency)}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="add-qty">Quantity to add</Label>
          <NumberInput
            id="add-qty"
            integer
            min={1}
            placeholder="1"
            value={form.watch('quantity')}
            onChange={(value) => {
              if (value === '') {
                form.setValue('quantity', '', { shouldDirty: true, shouldValidate: true })
                return
              }
              const qty = Math.max(1, Math.floor(Number(value) || 1))
              form.setValue('quantity', qty, { shouldDirty: true, shouldValidate: true })
              const current = form.getValues('costBreakdown') as ProductCostBreakdown | null
              if (current) {
                form.setValue(
                  'costBreakdown',
                  normalizeCostBreakdown({ ...current, productionQuantity: qty }),
                  { shouldDirty: true },
                )
              }
            }}
          />
          <p className="text-sm text-red-600" role="alert">
            {String(form.formState.errors.quantity?.message ?? '')}
          </p>
        </div>

        <div className="rounded-xl border border-teal-100 bg-teal-50/60 px-3 py-2 text-sm">
          New stock preview:{' '}
          <span className="font-bold text-teal-800 tabular-nums">{preview}</span>
          {weightedPreview ? (
            <span className="mt-1 block text-xs text-teal-800">
              New average cost: {formatCurrency(weightedPreview, currency)}
            </span>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Purchase cost / unit (optional)</Label>
            <CurrencyInput
              currency={currency}
              value={purchaseCost || ''}
              onChange={(value) => form.setValue('purchaseCost', value, { shouldDirty: true })}
            />
            <p className="text-xs text-zinc-500">
              Or use the cost calculator below. Weighted average updates Cost Price.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-date">Date</Label>
            <Input id="add-date" type="date" {...form.register('date')} />
          </div>
        </div>

        <ProductCostCalculator
          currency={currency}
          value={costBreakdown}
          sellingPrice={product.sellingPrice}
          quantityLocked
          quantityOverride={Math.max(1, quantity || 1)}
          existingStockQty={product.currentStock}
          existingUnitCost={product.costPrice}
          onChange={(breakdown) => {
            if (!breakdown) {
              form.setValue('costBreakdown', null, { shouldDirty: true })
              return
            }
            const synced = normalizeCostBreakdown({
              ...breakdown,
              productionQuantity: Math.max(1, quantity || 1),
            })
            form.setValue('costBreakdown', synced, { shouldDirty: true })
          }}
          onInventoryCostChange={(inventoryCostPerUnit) => {
            form.setValue('purchaseCost', inventoryCostPerUnit, { shouldDirty: true })
          }}
        />

        <div className="space-y-2">
          <Label htmlFor="supplier">Supplier (optional)</Label>
          <Input id="supplier" {...form.register('supplier')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reference">Reference / invoice (optional)</Label>
          <Input id="reference" {...form.register('reference')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="add-notes">Notes (optional)</Label>
          <Textarea id="add-notes" {...form.register('notes')} />
        </div>

        <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4">
          <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={pending}>{pending ? 'Saving…' : 'Add Stock'}</Button>
        </div>
      </form>
    </ProductModalShell>
  )
}
