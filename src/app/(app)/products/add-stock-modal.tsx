'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { addStockAction, listPurchaseCashAccountsAction } from '@/actions/products'
import { ProductModalShell } from '@/app/(app)/products/product-modal-shell'
import type { ProductRow } from '@/app/(app)/products/products-table'
import { CurrencyInput } from '@/components/shared/currency-input'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { NumberInput } from '@/components/shared/number-input'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { todayInputValue } from '@/lib/dates'
import { formatCurrency, money, moneyNumber } from '@/lib/money'
import { weightedAverageCost } from '@/lib/product-cost'
import { addStockSchema, type AddStockInput } from '@/lib/validations/product'

type CashAccountOption = {
  id: string
  name: string
  type: string
  currentBalance: string
}

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
  const [accounts, setAccounts] = useState<CashAccountOption[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(false)

  const defaultUnitCost =
    product && moneyNumber(product.defaultPurchaseCost) > 0
      ? product.defaultPurchaseCost
      : product && moneyNumber(product.costPrice) > 0
        ? product.costPrice
        : ''

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
      paymentMode: 'PAID',
      cashAccountId: '',
    },
  })

  useEffect(() => {
    if (!product || !open) return
    form.reset({
      productId: product.id,
      quantity: 1,
      date: todayInputValue(),
      purchaseCost: defaultUnitCost,
      supplier: '',
      reference: '',
      notes: '',
      paymentMode: 'PAID',
      cashAccountId: '',
    })
    setLoadingAccounts(true)
    void listPurchaseCashAccountsAction().then((result) => {
      setLoadingAccounts(false)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      setAccounts(result.data)
      if (result.data.length === 1) {
        form.setValue('cashAccountId', result.data[0].id)
      }
      if (result.data.length === 0) {
        form.setValue('paymentMode', 'UNPAID')
      }
    })
  }, [product, open, form, defaultUnitCost])

  const quantity = Number(form.watch('quantity')) || 0
  const purchaseCost = form.watch('purchaseCost') as string
  const paymentMode = form.watch('paymentMode') as 'PAID' | 'UNPAID'
  const unitCostNum = moneyNumber(purchaseCost)
  const totalPurchaseValue = useMemo(
    () => moneyNumber(money(unitCostNum).times(Math.max(0, quantity))),
    [unitCostNum, quantity],
  )
  const previewStock = product ? product.currentStock + Math.max(0, quantity) : 0
  const weightedPreview = useMemo(() => {
    if (!product || !(unitCostNum > 0) || quantity <= 0) return null
    return weightedAverageCost(product.currentStock, product.costPrice, quantity, unitCostNum)
  }, [product, unitCostNum, quantity])

  if (!product) return null

  return (
    <ProductModalShell
      open={open}
      onOpenChange={onOpenChange}
      title="Purchase Stock"
      description={`Add purchased inventory for ${product.name}. Purchase value becomes inventory — not an expense.`}
      wide
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
            toast.success(result.message ?? 'Stock purchased')
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
            Current stock: {product.currentStock} · Current inventory cost:{' '}
            {formatCurrency(product.costPrice, currency)}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="add-date">Purchase date</Label>
            <Input id="add-date" type="date" {...form.register('date')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-qty">Quantity purchased</Label>
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
                form.setValue('quantity', Math.max(1, Math.floor(Number(value) || 1)), {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }}
            />
            <p className="text-sm text-red-600" role="alert">
              {String(form.formState.errors.quantity?.message ?? '')}
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Purchase cost per unit</Label>
            <CurrencyInput
              currency={currency}
              value={purchaseCost || ''}
              onChange={(value) =>
                form.setValue('purchaseCost', value, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            />
            <p className="text-xs text-zinc-500">
              Enter the cost of one unit (e.g. AED 100), not the full invoice total.
            </p>
            <p className="text-sm text-red-600" role="alert">
              {String(form.formState.errors.purchaseCost?.message ?? '')}
            </p>
          </div>
          <div className="space-y-2">
            <Label>Total purchase amount</Label>
            <div className="flex h-10 items-center rounded-md border bg-zinc-50 px-3 text-sm font-semibold">
              <CurrencyDisplay value={totalPurchaseValue} currency={currency} />
            </div>
            <p className="text-xs text-zinc-500">
              Quantity × cost per unit. This increases inventory value, not expenses.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-teal-100 bg-teal-50/60 px-3 py-2 text-sm text-teal-900">
          After purchase: stock{' '}
          <span className="font-bold tabular-nums">{previewStock}</span>
          {weightedPreview ? (
            <span className="mt-1 block text-xs">
              New average unit cost: {formatCurrency(weightedPreview, currency)}
            </span>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="supplier">Supplier (optional)</Label>
            <Input id="supplier" {...form.register('supplier')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reference">Reference / invoice number</Label>
            <Input id="reference" {...form.register('reference')} />
          </div>
        </div>

        <div className="space-y-3 rounded-lg border border-zinc-200 p-3">
          <div className="space-y-2">
            <Label htmlFor="paymentMode">Payment</Label>
            <select
              id="paymentMode"
              className="h-10 w-full rounded-md border bg-transparent px-3 text-sm"
              {...form.register('paymentMode')}
            >
              <option value="PAID">Paid from Cash or Bank</option>
              <option value="UNPAID">Unpaid / on credit (inventory only)</option>
            </select>
          </div>

          {paymentMode === 'PAID' ? (
            <div className="space-y-2">
              <Label htmlFor="cashAccountId">Paid from Cash or Bank</Label>
              {loadingAccounts ? (
                <p className="text-xs text-zinc-500">Loading accounts…</p>
              ) : accounts.length === 0 ? (
                <p className="text-xs text-amber-700">
                  No active cash/bank accounts. Create one in Cash & Bank, or choose unpaid /
                  on credit.
                </p>
              ) : (
                <select
                  id="cashAccountId"
                  className="h-10 w-full rounded-md border bg-transparent px-3 text-sm"
                  {...form.register('cashAccountId')}
                >
                  <option value="">Select account…</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({account.type}) · bal{' '}
                      {formatCurrency(account.currentBalance, currency)}
                    </option>
                  ))}
                </select>
              )}
              <p className="text-xs text-zinc-500">
                Cash/bank decreases by the total purchase amount. Profit is unchanged until
                units are sold.
              </p>
              <p className="text-sm text-red-600" role="alert">
                {String(form.formState.errors.cashAccountId?.message ?? '')}
              </p>
            </div>
          ) : (
            <p className="text-xs text-zinc-500">
              Inventory increases now. No cash movement and no expense are recorded.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="add-notes">Notes (optional)</Label>
          <Textarea id="add-notes" {...form.register('notes')} />
        </div>

        <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button disabled={pending}>{pending ? 'Saving…' : 'Record purchase'}</Button>
        </div>
      </form>
    </ProductModalShell>
  )
}
