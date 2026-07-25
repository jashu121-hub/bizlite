'use client'

import { useEffect, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { CurrencyInput } from '@/components/shared/currency-input'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PRODUCT_CATEGORIES } from '@/lib/constants'
import { productSchema, type ProductInput } from '@/lib/validations/product'
import { cn } from '@/lib/utils'

type ProductFormProps = {
  currency: string
  initial?: Partial<ProductInput>
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
      costPrice: '0',
      sellingPrice: '0',
      openingStock: 0,
      lowStockLevel: 5,
      notes: '',
      isActive: true,
      ...initial,
    },
  })

  useEffect(() => {
    onDirtyChange?.(form.formState.isDirty)
  }, [form.formState.isDirty, onDirtyChange])

  const submit = (data: ProductInput) =>
    startTransition(async () => {
      const result = await onSubmit(data)
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

  const field = (label: string, name: keyof ProductInput, type = 'text') => (
    <div className="space-y-2">
      <Label htmlFor={String(name)}>{label}</Label>
      <Input
        id={String(name)}
        type={type}
        {...form.register(name as never, { valueAsNumber: type === 'number' })}
      />
      <p className="text-sm text-red-600" role="alert">
        {String(form.formState.errors[name]?.message ?? '')}
      </p>
    </div>
  )

  return (
    <form onSubmit={form.handleSubmit(submit)} className={cn('space-y-5', className)}>
      <div className="grid gap-5 sm:grid-cols-2">
        {field('Product name', 'name')}
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
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        {field('SKU', 'sku')}
        <div className="space-y-2">
          <Label>Active</Label>
          <label className="flex h-10 items-center gap-2 text-sm">
            <input type="checkbox" {...form.register('isActive')} />
            Available for sale
          </label>
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Cost price</Label>
          <CurrencyInput
            currency={currency}
            value={form.watch('costPrice')}
            onChange={(value) =>
              form.setValue('costPrice', value, { shouldValidate: true, shouldDirty: true })
            }
          />
        </div>
        <div className="space-y-2">
          <Label>Selling price</Label>
          <CurrencyInput
            currency={currency}
            value={form.watch('sellingPrice')}
            onChange={(value) =>
              form.setValue('sellingPrice', value, { shouldValidate: true, shouldDirty: true })
            }
          />
        </div>
      </div>
      <div className={cn('grid gap-5', hideOpeningStock ? '' : 'sm:grid-cols-2')}>
        {hideOpeningStock ? null : field('Opening stock', 'openingStock', 'number')}
        {field('Low stock alert level', 'lowStockLevel', 'number')}
      </div>
      {hideOpeningStock ? (
        <p className="text-xs text-zinc-500">
          Current stock is managed with Add Stock or Adjust Stock actions.
        </p>
      ) : null}
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
