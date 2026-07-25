'use client'

import { useEffect, useMemo, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { addStockAction } from '@/actions/products'
import { ProductModalShell } from '@/app/(app)/products/product-modal-shell'
import { CurrencyInput } from '@/components/shared/currency-input'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { todayInputValue } from '@/lib/dates'
import { addStockSchema, type AddStockInput } from '@/lib/validations/product'
import type { ProductRow } from '@/app/(app)/products/products-table'

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
      })
    }
  }, [product, open, form])

  const quantity = Number(form.watch('quantity')) || 0
  const preview = useMemo(
    () => (product ? product.currentStock + Math.max(0, quantity) : 0),
    [product, quantity],
  )

  if (!product) return null

  return (
    <ProductModalShell
      open={open}
      onOpenChange={onOpenChange}
      title="Add Stock"
      description={`Increase inventory for ${product.name}`}
    >
      <form
        className="space-y-4"
        onSubmit={form.handleSubmit((data: AddStockInput) =>
          startTransition(async () => {
            const result = await addStockAction(data)
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
          <p className="mt-1 text-zinc-600">Current stock: {product.currentStock}</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="add-qty">Quantity to add</Label>
          <Input
            id="add-qty"
            type="number"
            min={1}
            {...form.register('quantity', { valueAsNumber: true })}
          />
          <p className="text-sm text-red-600" role="alert">
            {String(form.formState.errors.quantity?.message ?? '')}
          </p>
        </div>

        <div className="rounded-xl border border-teal-100 bg-teal-50/60 px-3 py-2 text-sm">
          New stock preview:{' '}
          <span className="font-bold text-teal-800 tabular-nums">{preview}</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Purchase cost / unit (optional)</Label>
            <CurrencyInput
              currency={currency}
              value={form.watch('purchaseCost') || ''}
              onChange={(value) => form.setValue('purchaseCost', value, { shouldDirty: true })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-date">Date</Label>
            <Input id="add-date" type="date" {...form.register('date')} />
          </div>
        </div>

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
