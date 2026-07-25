'use client'

import { useEffect, useTransition } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { CustomerSelector, type CustomerOption } from '@/components/shared/customer-selector'
import { CurrencyInput } from '@/components/shared/currency-input'
import { ProductSelector, type ProductOption } from '@/components/shared/product-selector'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { PAYMENT_METHODS } from '@/lib/constants'
import { todayInputValue } from '@/lib/dates'
import { formatCurrency } from '@/lib/money'
import { saleSchema, type SaleInput } from '@/lib/validations/sale'
import { cn } from '@/lib/utils'

type SalesFormProps = {
  products: ProductOption[]
  customers: CustomerOption[]
  currency: string
  initial?: Partial<SaleInput>
  onSubmit: (data: SaleInput) => Promise<any>
  onSuccess?: () => void
  onCancel?: () => void
  onDirtyChange?: (dirty: boolean) => void
  className?: string
}

export function SalesForm({
  products,
  customers,
  currency,
  initial,
  onSubmit,
  onSuccess,
  onCancel,
  onDirtyChange,
  className,
}: SalesFormProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const form = useForm<any>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      date: todayInputValue(),
      customerId: '',
      items: [{ productId: '', quantity: 1, unitSellingPrice: '0' }],
      discount: '0',
      amountPaid: '0',
      paymentMethod: 'CASH',
      notes: '',
      ...initial,
    },
  })
  const itemsArray = useFieldArray({ control: form.control, name: 'items' })
  const items = form.watch('items') ?? []
  const subtotal = items.reduce(
    (sum: number, item: any) =>
      sum + (Number(item.quantity) || 0) * (Number(item.unitSellingPrice) || 0),
    0,
  )
  const total = Math.max(0, subtotal - (Number(form.watch('discount')) || 0))
  const amountPaid = Number(form.watch('amountPaid')) || 0
  const balance = Math.max(0, total - amountPaid)

  useEffect(() => {
    onDirtyChange?.(form.formState.isDirty)
  }, [form.formState.isDirty, onDirtyChange])

  const updateProduct = (index: number, id: string) => {
    const product = products.find((item) => item.id === id)
    form.setValue(`items.${index}.productId`, id, { shouldDirty: true })
    if (product) {
      form.setValue(`items.${index}.unitSellingPrice`, String(product.sellingPrice), {
        shouldDirty: true,
      })
    }
  }

  const handleCancel = () => {
    if (onCancel) onCancel()
    else router.back()
  }

  return (
    <form
      className={cn('space-y-5', className)}
      onSubmit={form.handleSubmit((data: SaleInput) =>
        startTransition(async () => {
          const overStock = data.items.some(
            (item) =>
              item.quantity > (products.find((product) => product.id === item.productId)?.currentStock ?? 0),
          )
          if (overStock) {
            toast.error('A line exceeds available stock')
            return
          }
          const result = await onSubmit(data)
          if (!result.success) {
            toast.error(result.error)
            return
          }
          toast.success(result.message ?? 'Sale saved')
          if (onSuccess) {
            onSuccess()
            router.refresh()
            return
          }
          router.push(`/sales/${result.data?.id ?? ''}`)
          router.refresh()
        }),
      )}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="sale-date">Date</label>
          <Input id="sale-date" type="date" {...form.register('date')} />
        </div>
        <CustomerSelector
          customers={customers}
          value={form.watch('customerId')}
          onChange={(value) => form.setValue('customerId', value, { shouldDirty: true })}
        />
      </div>

      <div className="space-y-3">
        <div className="flex justify-between">
          <h2 className="font-semibold">Items</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              itemsArray.append({ productId: '', quantity: 1, unitSellingPrice: '0' })
            }
          >
            Add line
          </Button>
        </div>
        {itemsArray.fields.map((line, index) => {
          const product = products.find((item) => item.id === form.watch(`items.${index}.productId`))
          return (
            <div
              key={line.id}
              className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_90px_130px_auto]"
            >
              <ProductSelector
                products={products}
                value={form.watch(`items.${index}.productId`)}
                onChange={(id) => updateProduct(index, id)}
                label={`Product ${index + 1}`}
                id={`product-${index}`}
              />
              <div className="space-y-2">
                <label htmlFor={`qty-${index}`}>Qty</label>
                <Input
                  id={`qty-${index}`}
                  type="number"
                  min="1"
                  max={product?.currentStock}
                  {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-2">
                <label>Unit price</label>
                <CurrencyInput
                  currency={currency}
                  value={form.watch(`items.${index}.unitSellingPrice`)}
                  onChange={(value) =>
                    form.setValue(`items.${index}.unitSellingPrice`, value, { shouldDirty: true })
                  }
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                className="self-end"
                disabled={itemsArray.fields.length === 1}
                onClick={() => itemsArray.remove(index)}
              >
                Remove
              </Button>
              {product ? (
                <p className="text-xs text-zinc-500 sm:col-span-4">{product.currentStock} in stock</p>
              ) : null}
            </div>
          )
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <label>Discount</label>
          <CurrencyInput
            currency={currency}
            value={form.watch('discount')}
            onChange={(value) => form.setValue('discount', value, { shouldDirty: true })}
          />
        </div>
        <div className="space-y-2">
          <label>Amount paid</label>
          <CurrencyInput
            currency={currency}
            value={form.watch('amountPaid')}
            onChange={(value) => form.setValue('amountPaid', value, { shouldDirty: true })}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="payment-method">Payment method</label>
          <select
            id="payment-method"
            className="h-10 w-full rounded-md border bg-transparent px-3"
            {...form.register('paymentMethod')}
          >
            {PAYMENT_METHODS.map((method) => (
              <option key={method.value} value={method.value}>
                {method.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1 rounded-lg bg-zinc-100 p-4 text-right dark:bg-zinc-900">
        <p>Subtotal: {formatCurrency(subtotal, currency)}</p>
        <p>Discount: {formatCurrency(Number(form.watch('discount')) || 0, currency)}</p>
        <p>Paid: {formatCurrency(amountPaid, currency)}</p>
        <p>Balance: {formatCurrency(balance, currency)}</p>
        <p className="text-lg font-bold">Total: {formatCurrency(total, currency)}</p>
      </div>

      <div className="space-y-2">
        <label htmlFor="sale-notes">Notes</label>
        <Textarea id="sale-notes" {...form.register('notes')} />
      </div>

      <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4">
        <Button type="button" variant="outline" onClick={handleCancel} disabled={pending}>
          Cancel
        </Button>
        <Button disabled={pending}>{pending ? 'Saving…' : 'Save sale'}</Button>
      </div>
    </form>
  )
}
