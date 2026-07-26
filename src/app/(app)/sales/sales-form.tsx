'use client'

import { useEffect, useTransition } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { createSaleAction, updateSaleAction } from '@/actions/sales'
import { FieldHelp } from '@/components/help/field-help'
import { CustomerSelector, type CustomerOption } from '@/components/shared/customer-selector'
import { CurrencyInput } from '@/components/shared/currency-input'
import { NumberInput } from '@/components/shared/number-input'
import { ProductSelector, type ProductOption } from '@/components/shared/product-selector'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { PAYMENT_METHODS } from '@/lib/constants'
import { todayInputValue } from '@/lib/dates'
import { formatCurrency } from '@/lib/money'
import { saleSchema, type SaleInput } from '@/lib/validations/sale'
import { cn } from '@/lib/utils'

type CashAccountOption = { id: string; name: string; type: string }

type SalesFormProps = {
  products: ProductOption[]
  customers: CustomerOption[]
  cashAccounts?: CashAccountOption[]
  currency: string
  initial?: Partial<SaleInput>
  /** When set, form updates this sale instead of creating a new one. */
  saleId?: string
  productsLoading?: boolean
  productsError?: string | null
  onSubmit?: (data: SaleInput) => Promise<any>
  onSuccess?: () => void
  onCancel?: () => void
  onDirtyChange?: (dirty: boolean) => void
  className?: string
}

const emptyLine = { productId: '', quantity: 1, unitSellingPrice: '' }

export function SalesForm({
  products,
  customers,
  cashAccounts = [],
  currency,
  initial,
  saleId,
  productsLoading = false,
  productsError = null,
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
      discount: '',
      amountPaid: '',
      paymentMethod: 'CASH',
      cashAccountId: '',
      notes: '',
      ...initial,
      items: initial?.items?.length ? initial.items : [emptyLine],
    },
  })
  const itemsArray = useFieldArray({ control: form.control, name: 'items' })
  const items = useWatch({ control: form.control, name: 'items' }) ?? []
  const discountRaw = useWatch({ control: form.control, name: 'discount' })
  const amountPaidRaw = useWatch({ control: form.control, name: 'amountPaid' })
  const discountValue = discountRaw === '' || discountRaw == null ? 0 : Number(discountRaw) || 0
  const amountPaid = amountPaidRaw === '' || amountPaidRaw == null ? 0 : Number(amountPaidRaw) || 0

  const subtotal = items.reduce(
    (sum: number, item: { quantity?: number; unitSellingPrice?: string }) => {
      const qty = Number(item?.quantity) || 0
      const price =
        item?.unitSellingPrice === '' || item?.unitSellingPrice == null
          ? 0
          : Number(item.unitSellingPrice) || 0
      return sum + qty * price
    },
    0,
  )
  const total = Math.max(0, subtotal - Math.max(0, discountValue))
  const balance = Math.max(0, total - amountPaid)

  useEffect(() => {
    onDirtyChange?.(form.formState.isDirty)
  }, [form.formState.isDirty, onDirtyChange])

  const selectedProductIds = items
    .map((item: { productId?: string }) => item.productId)
    .filter(Boolean) as string[]

  const updateProduct = (index: number, id: string) => {
    const product = products.find((item) => item.id === id)
    if (!product) return

    const existingIndex = items.findIndex(
      (item: { productId?: string }, i: number) => i !== index && item.productId === id,
    )
    if (existingIndex >= 0) {
      const mergedQty =
        (Number(items[existingIndex].quantity) || 0) + (Number(items[index].quantity) || 1)
      const maxQty = product.currentStock
      form.setValue(
        `items.${existingIndex}.quantity`,
        Math.min(Math.max(1, mergedQty), Math.max(1, maxQty)),
        { shouldDirty: true, shouldValidate: true },
      )
      if (itemsArray.fields.length > 1) {
        itemsArray.remove(index)
      } else {
        form.setValue(`items.${index}.productId`, '', { shouldDirty: true })
        form.setValue(`items.${index}.quantity`, 1, { shouldDirty: true })
        form.setValue(`items.${index}.unitSellingPrice`, '0', { shouldDirty: true })
      }
      toast.message(`Merged into existing ${product.name} line`)
      return
    }

    form.setValue(`items.${index}.productId`, id, { shouldDirty: true, shouldValidate: true })
    form.setValue(`items.${index}.unitSellingPrice`, String(product.sellingPrice), {
      shouldDirty: true,
      shouldValidate: true,
    })
    const currentQty = Number(form.getValues(`items.${index}.quantity`)) || 1
    form.setValue(`items.${index}.quantity`, Math.max(1, currentQty), {
      shouldDirty: true,
      shouldValidate: true,
    })
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
          if (!data.items.some((item) => item.productId)) {
            toast.error('Select at least one product')
            return
          }
          if (discountValue < 0) {
            toast.error('Discount cannot be negative')
            return
          }
          if (discountValue > subtotal) {
            toast.error('Discount cannot be greater than subtotal')
            return
          }
          if (amountPaid < 0) {
            toast.error('Amount paid cannot be negative')
            return
          }
          if (amountPaid > total) {
            toast.error('Amount paid cannot be greater than total')
            return
          }

          for (const item of data.items) {
            const product = products.find((row) => row.id === item.productId)
            if (!product) {
              toast.error('A selected product is no longer available')
              return
            }
            if (item.quantity <= 0) {
              toast.error('Quantity must be greater than zero')
              return
            }
            if (Number(item.unitSellingPrice) < 0) {
              toast.error('Unit price cannot be negative')
              return
            }
            if (item.quantity > product.currentStock) {
              toast.error(`${product.name} only has ${product.currentStock} in stock`)
              return
            }
          }

          const result = onSubmit
            ? await onSubmit(data)
            : saleId
              ? await updateSaleAction(saleId, data)
              : await createSaleAction(data)
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
          router.push(`/sales/${result.data?.id ?? saleId ?? ''}`)
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
            disabled={productsLoading || !!productsError}
            onClick={() => itemsArray.append({ ...emptyLine })}
          >
            Add line
          </Button>
        </div>

        {productsError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {productsError}
          </p>
        ) : null}

        {!productsLoading && !productsError && products.length === 0 ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            No active products available. On the Products page, restore/activate a product (Archived
            items cannot be sold).
          </p>
        ) : null}

        {itemsArray.fields.map((line, index) => {
          const productId = form.watch(`items.${index}.productId`) as string
          const product = products.find((item) => item.id === productId)
          const qty = Number(form.watch(`items.${index}.quantity`)) || 0
          const unitPrice = Number(form.watch(`items.${index}.unitSellingPrice`)) || 0
          const lineTotal = qty * unitPrice
          const excludeIds = selectedProductIds.filter((id) => id !== productId)

          return (
            <div
              key={line.id}
              className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[1.4fr_110px_130px_auto]"
            >
              <ProductSelector
                products={products}
                value={productId}
                onChange={(id) => updateProduct(index, id)}
                currency={currency}
                label={`Product ${index + 1}`}
                id={`product-${index}`}
                loading={productsLoading}
                error={productsError}
                excludeIds={excludeIds}
              />
              <div className="space-y-2">
                <label htmlFor={`qty-${index}`}>Qty</label>
                <NumberInput
                  id={`qty-${index}`}
                  integer
                  min={1}
                  max={product?.currentStock}
                  placeholder="1"
                  value={form.watch(`items.${index}.quantity`)}
                  onChange={(value) => {
                    if (value === '') {
                      form.setValue(`items.${index}.quantity`, '', {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                      return
                    }
                    let next = Number.parseInt(value, 10)
                    if (Number.isNaN(next)) return
                    if (product && next > product.currentStock) {
                      next = product.currentStock
                      toast.error(`Only ${product.currentStock} in stock`)
                    }
                    form.setValue(`items.${index}.quantity`, next, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }}
                />
                <p className="text-xs text-zinc-500">
                  {product
                    ? `${product.currentStock} available`
                    : productsLoading
                      ? 'Loading stock…'
                      : 'Select a product'}
                </p>
              </div>
              <div className="space-y-2">
                <label>Unit price</label>
                <CurrencyInput
                  currency={currency}
                  value={form.watch(`items.${index}.unitSellingPrice`)}
                  onChange={(value) =>
                    form.setValue(`items.${index}.unitSellingPrice`, value, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                />
                <p className="text-xs text-zinc-500">
                  Line: {formatCurrency(lineTotal, currency)}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                className="self-start sm:self-end"
                disabled={itemsArray.fields.length === 1}
                onClick={() => itemsArray.remove(index)}
              >
                Remove
              </Button>
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

      {cashAccounts.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <label htmlFor="cash-account">Deposit to account (optional)</label>
            <FieldHelp
              label="Payment Account"
              text="The Cash or Bank account where money is received or paid."
              guideHref="/help#cash-and-bank"
            />
          </div>
          <select
            id="cash-account"
            className="h-10 w-full rounded-md border bg-transparent px-3"
            {...form.register('cashAccountId')}
          >
            <option value="">Do not update Cash & Bank</option>
            {cashAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-zinc-500">
            When amount paid is entered, it is added to the selected account ledger (not as income
            separately).
          </p>
        </div>
      ) : null}

      <div className="space-y-1 rounded-lg bg-zinc-100 p-4 text-right dark:bg-zinc-900">
        <p>Subtotal: {formatCurrency(subtotal, currency)}</p>
        <p>Discount: {formatCurrency(Math.max(0, discountValue), currency)}</p>
        <p>Paid: {formatCurrency(amountPaid, currency)}</p>
        <p>Balance: {formatCurrency(balance, currency)}</p>
        <p className="text-lg font-bold">Total: {formatCurrency(total, currency)}</p>
      </div>

      <div className="space-y-2">
        <label htmlFor="sale-notes">Notes</label>
        <Textarea id="sale-notes" {...form.register('notes')} />
      </div>

      <div className="sticky bottom-0 z-10 flex justify-end gap-2 border-t border-zinc-100 bg-white pt-4">
        <Button type="button" variant="outline" onClick={handleCancel} disabled={pending}>
          Cancel
        </Button>
        <Button disabled={pending || productsLoading || !!productsError}>
          {pending ? 'Saving…' : 'Save sale'}
        </Button>
      </div>
    </form>
  )
}
