'use client'

import { useEffect, useMemo, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { adjustStockDetailedAction } from '@/actions/products'
import { ProductModalShell } from '@/app/(app)/products/product-modal-shell'
import type { ProductRow } from '@/app/(app)/products/products-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { todayInputValue } from '@/lib/dates'
import {
  adjustStockDetailedSchema,
  STOCK_REASONS,
  type AdjustStockDetailedInput,
} from '@/lib/validations/product'

export function AdjustStockModal({
  product,
  open,
  onOpenChange,
}: {
  product: ProductRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const form = useForm<any>({
    resolver: zodResolver(adjustStockDetailedSchema),
    defaultValues: {
      productId: '',
      mode: 'INCREASE',
      quantity: 1,
      reason: 'Manual Correction',
      date: todayInputValue(),
      notes: '',
    },
  })

  useEffect(() => {
    if (product && open) {
      form.reset({
        productId: product.id,
        mode: 'INCREASE',
        quantity: 1,
        reason: 'Manual Correction',
        date: todayInputValue(),
        notes: '',
      })
    }
  }, [product, open, form])

  const mode = form.watch('mode') as AdjustStockDetailedInput['mode']
  const quantity = Number(form.watch('quantity')) || 0
  const preview = useMemo(() => {
    if (!product) return 0
    if (mode === 'INCREASE') return product.currentStock + quantity
    if (mode === 'DECREASE') return product.currentStock - quantity
    return quantity
  }, [product, mode, quantity])

  const reducing = product ? preview < product.currentStock : false

  if (!product) return null

  return (
    <ProductModalShell
      open={open}
      onOpenChange={onOpenChange}
      title="Adjust Stock"
      description={`Correct inventory for ${product.name}`}
    >
      <form
        className="space-y-4"
        onSubmit={form.handleSubmit((data: AdjustStockDetailedInput) =>
          startTransition(async () => {
            if (preview < 0) {
              toast.error('Stock cannot become negative')
              return
            }
            if (reducing) {
              const confirmed = window.confirm(
                `Reduce stock for ${product.name} from ${product.currentStock} to ${preview}?`,
              )
              if (!confirmed) return
            }
            const result = await adjustStockDetailedAction(data)
            if (!result.success) {
              toast.error(result.error)
              return
            }
            toast.success(result.message ?? 'Stock adjusted')
            onOpenChange(false)
            router.refresh()
          }),
        )}
      >
        <input type="hidden" {...form.register('productId')} />
        <div className="rounded-xl bg-zinc-50 px-3 py-3 text-sm">
          <p className="font-semibold text-zinc-900">{product.name}</p>
          <p className="mt-1 text-zinc-600">Current stock: {product.currentStock}</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="adj-mode">Adjustment type</Label>
          <select
            id="adj-mode"
            className="h-10 w-full rounded-md border bg-transparent px-3"
            {...form.register('mode')}
          >
            <option value="INCREASE">Increase Stock</option>
            <option value="DECREASE">Decrease Stock</option>
            <option value="SET">Set Exact Quantity</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="adj-qty">
            {mode === 'SET' ? 'Exact quantity' : 'Adjustment quantity'}
          </Label>
          <Input
            id="adj-qty"
            type="number"
            min={0}
            {...form.register('quantity', { valueAsNumber: true })}
          />
          <p className="text-sm text-red-600" role="alert">
            {String(form.formState.errors.quantity?.message ?? '')}
          </p>
        </div>

        <div
          className={`rounded-xl border px-3 py-2 text-sm ${
            preview < 0
              ? 'border-red-200 bg-red-50 text-red-700'
              : reducing
                ? 'border-amber-200 bg-amber-50 text-amber-800'
                : 'border-teal-100 bg-teal-50/60 text-teal-800'
          }`}
        >
          New stock preview: <span className="font-bold tabular-nums">{preview}</span>
          {reducing ? <span className="ml-2 text-xs">(stock reduction)</span> : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="adj-reason">Reason</Label>
            <select
              id="adj-reason"
              className="h-10 w-full rounded-md border bg-transparent px-3"
              {...form.register('reason')}
            >
              {STOCK_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="adj-date">Date</Label>
            <Input id="adj-date" type="date" {...form.register('date')} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="adj-notes">Notes</Label>
          <Textarea id="adj-notes" {...form.register('notes')} />
        </div>

        <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4">
          <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={pending || preview < 0}>
            {pending ? 'Saving…' : 'Save Adjustment'}
          </Button>
        </div>
      </form>
    </ProductModalShell>
  )
}
