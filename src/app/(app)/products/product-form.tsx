'use client'

import Link from 'next/link'
import { useEffect, useMemo, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Calculator } from 'lucide-react'

import { FieldHelp } from '@/components/help/field-help'
import { CurrencyInput } from '@/components/shared/currency-input'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { NumberInput } from '@/components/shared/number-input'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PRODUCT_CATEGORIES } from '@/lib/constants'
import { moneyNumber } from '@/lib/money'
import {
  PRODUCT_TYPE_OPTIONS,
  productSchema,
  type ProductInput,
} from '@/lib/validations/product'
import { cn } from '@/lib/utils'

const UNIT_OPTIONS = ['pcs', 'kg', 'g', 'litre', 'metre', 'hour', 'set', 'box', 'pair']

type ProductFormProps = {
  currency: string
  initial?: Partial<ProductInput> & {
    id?: string
    /** When true, current inventory cost is ledger-driven and read-only. */
    inventoryCostReadOnly?: boolean
  }
  onSubmit: (data: ProductInput) => Promise<any>
  onSuccess?: () => void
  onCancel?: () => void
  onDirtyChange?: (dirty: boolean) => void
  className?: string
  /** Hide opening stock when editing — stock changes go through Add/Adjust Stock */
  hideOpeningStock?: boolean
}

export function ProductForm({
  currency,
  initial,
  onSubmit,
  onSuccess,
  onCancel,
  onDirtyChange,
  className,
  hideOpeningStock = false,
}: ProductFormProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const form = useForm<any>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      category: 'General',
      sku: '',
      productType: 'RESALE',
      unitOfMeasure: 'pcs',
      costPrice: '0',
      defaultPurchaseCost: '',
      standardProductionCost: '',
      sellingPrice: '0',
      openingStock: '0',
      openingStockUnitCost: '',
      lowStockLevel: 5,
      notes: '',
      isActive: true,
      costBreakdown: null,
      ...initial,
    },
  })

  useEffect(() => {
    onDirtyChange?.(form.formState.isDirty)
  }, [form.formState.isDirty, onDirtyChange])

  const productType = form.watch('productType') as ProductInput['productType']
  const openingStock = Number(form.watch('openingStock') || 0)
  const openingUnitCost = form.watch('openingStockUnitCost') as string
  const openingValue = useMemo(
    () => moneyNumber(openingUnitCost) * Math.max(0, openingStock),
    [openingStock, openingUnitCost],
  )
  const sellingPrice = form.watch('sellingPrice') as string
  const isService = productType === 'SERVICE'
  const isManufactured = productType === 'MANUFACTURED'
  const isResale = productType === 'RESALE'
  const inventoryReadOnly = Boolean(initial?.inventoryCostReadOnly) || hideOpeningStock

  useEffect(() => {
    if (isService) {
      form.setValue('openingStock', 0, { shouldValidate: true })
      form.setValue('openingStockUnitCost', '', { shouldValidate: true })
      form.setValue('lowStockLevel', 0, { shouldValidate: true })
    }
  }, [isService, form])

  const submit = (data: ProductInput) =>
    startTransition(async () => {
      const payload: ProductInput = {
        ...data,
        costBreakdown: data.costBreakdown ?? null,
        // Map type-specific cost fields into costPrice for services / compatibility
        costPrice:
          data.productType === 'SERVICE'
            ? data.costPrice || '0'
            : data.costPrice || '0',
        defaultPurchaseCost:
          data.productType === 'RESALE'
            ? data.defaultPurchaseCost || data.costPrice || '0'
            : data.defaultPurchaseCost || '0',
      }
      const result = await onSubmit(payload)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success(result.message ?? 'Product saved')
      if (onSuccess) {
        onSuccess()
        router.refresh()
        return
      }
      router.push('/products')
      router.refresh()
    })

  return (
    <form onSubmit={form.handleSubmit(submit)} className={cn('space-y-5', className)}>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Product name</Label>
          <Input id="name" {...form.register('name')} />
          <p className="text-sm text-red-600" role="alert">
            {String(form.formState.errors.name?.message ?? '')}
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="sku">SKU</Label>
          <Input id="sku" {...form.register('sku')} />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <select
            id="category"
            className="h-10 w-full rounded-md border bg-transparent px-3"
            {...form.register('category')}
          >
            {PRODUCT_CATEGORIES.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="productType">Product type</Label>
            <FieldHelp
              label="Product Type"
              text="Resale products are bought and sold. Manufactured products get cost from the Product Cost Calculator. Services have no inventory."
              guideHref="/help#products-and-inventory"
            />
          </div>
          <select
            id="productType"
            className="h-10 w-full rounded-md border bg-transparent px-3"
            {...form.register('productType')}
          >
            {PRODUCT_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Available for sale</Label>
          <label className="flex h-10 items-center gap-2 text-sm">
            <input type="checkbox" {...form.register('isActive')} />
            Available for sale
          </label>
        </div>
        <div className="space-y-2">
          <Label htmlFor="unitOfMeasure">Unit of measurement</Label>
          <select
            id="unitOfMeasure"
            className="h-10 w-full rounded-md border bg-transparent px-3"
            {...form.register('unitOfMeasure')}
          >
            {UNIT_OPTIONS.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Label>Default selling price per unit</Label>
            <FieldHelp
              label="Default Selling Price Per Unit"
              text="Suggested price for future sales. It can be changed on the invoice."
              guideHref="/help#product-costing"
            />
          </div>
          <CurrencyInput
            currency={currency}
            value={sellingPrice}
            onChange={(value) =>
              form.setValue('sellingPrice', value, { shouldValidate: true, shouldDirty: true })
            }
          />
          <p className="text-xs text-zinc-500">
            Suggested price per unit for future sales. It can be changed on the invoice.
          </p>
          <p className="text-sm text-red-600" role="alert">
            {String(form.formState.errors.sellingPrice?.message ?? '')}
          </p>
        </div>

        {isService ? (
          <div className="space-y-2">
            <Label>Direct service cost (optional)</Label>
            <CurrencyInput
              currency={currency}
              value={form.watch('costPrice')}
              onChange={(value) =>
                form.setValue('costPrice', value || '0', {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
            />
            <p className="text-xs text-zinc-500">
              Optional cost used for service profitability. Services have no stock.
            </p>
          </div>
        ) : inventoryReadOnly ? (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label>Current inventory cost</Label>
              <FieldHelp
                label="Current Inventory Cost"
                text="Used for inventory valuation and COGS. Historical sales retain their original cost."
                guideHref="/help#product-costing"
              />
            </div>
            <div className="flex h-10 items-center rounded-md border bg-zinc-50 px-3 text-sm">
              <CurrencyDisplay value={initial?.costPrice || '0'} currency={currency} />
            </div>
            <p className="text-xs text-zinc-500">
              Used for inventory valuation and COGS. Historical sales retain their original cost.
            </p>
          </div>
        ) : null}
      </div>

      {isResale ? (
        <section className="space-y-4 rounded-lg border border-zinc-200 p-4">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">Cost and opening stock</h3>
            <p className="text-xs text-zinc-500">
              Enter purchase cost per unit (e.g. AED 100), not the total invoice. Total stock value
              = quantity × unit cost, and is inventory — not an expense.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Purchase cost per unit</Label>
              <CurrencyInput
                currency={currency}
                value={form.watch('defaultPurchaseCost') || form.watch('costPrice')}
                onChange={(value) => {
                  form.setValue('defaultPurchaseCost', value, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                  form.setValue('costPrice', value || '0', { shouldDirty: true })
                }}
              />
              <p className="text-xs text-zinc-500">
                Suggested unit cost for future purchases. Does not revalue existing stock.
              </p>
            </div>
            {!hideOpeningStock ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="openingStock">Opening or starting stock</Label>
                  <NumberInput
                    id="openingStock"
                    integer
                    min={0}
                    placeholder="0"
                    value={form.watch('openingStock') as string | number | undefined}
                    onChange={(value) =>
                      form.setValue('openingStock', value === '' ? 0 : Number(value), {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                  />
                  <p className="text-sm text-red-600" role="alert">
                    {String(form.formState.errors.openingStock?.message ?? '')}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Opening stock unit cost</Label>
                  <CurrencyInput
                    currency={currency}
                    value={openingUnitCost}
                    onChange={(value) =>
                      form.setValue('openingStockUnitCost', value, {
                        shouldValidate: true,
                        shouldDirty: true,
                      })
                    }
                  />
                  <p className="text-sm text-red-600" role="alert">
                    {String(form.formState.errors.openingStockUnitCost?.message ?? '')}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Opening stock value</Label>
                  <div className="flex h-10 items-center rounded-md border bg-zinc-50 px-3 text-sm">
                    <CurrencyDisplay value={openingValue} currency={currency} />
                  </div>
                  <p className="text-xs text-zinc-500">Quantity × unit cost (not an expense)</p>
                </div>
              </>
            ) : null}
          </div>
        </section>
      ) : null}

      {isManufactured ? (
        <section className="space-y-4 rounded-lg border border-teal-100 bg-teal-50/40 p-4">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">Production cost</h3>
            <p className="text-xs text-zinc-600">
              Cost will be calculated through Product Cost & Pricing. You can save this product with
              zero cost, zero selling price, and zero opening stock.
            </p>
          </div>
          {moneyNumber(initial?.standardProductionCost) > 0 ? (
            <div className="space-y-1">
              <Label>Standard production cost</Label>
              <div className="flex h-10 items-center rounded-md border bg-white px-3 text-sm">
                <CurrencyDisplay
                  value={initial?.standardProductionCost || '0'}
                  currency={currency}
                />
              </div>
              <p className="text-xs text-zinc-500">
                Suggested cost for future production batches. Does not revalue existing stock.
              </p>
            </div>
          ) : null}
          {!hideOpeningStock ? (
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="openingStockMfg">Opening stock</Label>
                <NumberInput
                  id="openingStockMfg"
                  integer
                  min={0}
                  placeholder="0"
                  value={form.watch('openingStock') as string | number | undefined}
                  onChange={(value) =>
                    form.setValue('openingStock', value === '' ? 0 : Number(value), {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                />
              </div>
              {openingStock > 0 ? (
                <div className="space-y-2">
                  <Label>Opening stock unit cost</Label>
                  <CurrencyInput
                    currency={currency}
                    value={openingUnitCost}
                    onChange={(value) =>
                      form.setValue('openingStockUnitCost', value, {
                        shouldValidate: true,
                        shouldDirty: true,
                      })
                    }
                  />
                  <p className="text-xs text-zinc-500">
                    Opening value:{' '}
                    <CurrencyDisplay value={openingValue} currency={currency} />
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
          <Button type="button" variant="secondary" asChild>
            <Link
              href={
                initial?.id
                  ? `/cost-pricing?productId=${initial.id}`
                  : '/cost-pricing'
              }
            >
              <Calculator className="h-4 w-4" />
              Calculate Product Cost
            </Link>
          </Button>
        </section>
      ) : null}

      {!isService ? (
        <div className="space-y-2">
          <Label htmlFor="lowStockLevel">Low-stock alert</Label>
          <NumberInput
            id="lowStockLevel"
            integer
            min={0}
            placeholder="0"
            value={form.watch('lowStockLevel') as string | number | undefined}
            onChange={(value) =>
              form.setValue('lowStockLevel', value === '' ? 0 : Number(value), {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
          />
          {hideOpeningStock ? (
            <p className="text-xs text-zinc-500">
              Current stock is managed with Add Stock or Adjust Stock actions.
            </p>
          ) : null}
        </div>
      ) : (
        <p className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
          Services do not use opening stock, low-stock alerts, Add Stock, or inventory valuation.
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" {...form.register('notes')} />
      </div>

      <div className="flex justify-end gap-3 border-t border-zinc-100 pt-4">
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => (onCancel ? onCancel() : router.back())}
        >
          Cancel
        </Button>
        <Button disabled={pending}>{pending ? 'Saving…' : 'Save product'}</Button>
      </div>
    </form>
  )
}
