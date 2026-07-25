'use client'

import { useEffect, useRef, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { ExpenseCategory, ExpenseCostType, ExpenseSubcategory } from '@prisma/client'

import { CurrencyInput } from '@/components/shared/currency-input'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  EXPENSE_CATEGORIES,
  EXPENSE_COST_TYPES,
  PAYMENT_METHODS,
  TRANSPORT_SUBCATEGORIES,
} from '@/lib/constants'
import { todayInputValue } from '@/lib/dates'
import {
  parseExpenseCostDefaults,
  suggestCostType,
  type ExpenseCostDefaultsMap,
} from '@/lib/expense-cost'
import { expenseSchema, type ExpenseInput } from '@/lib/validations/expense'
import { cn } from '@/lib/utils'

type ExpenseFormProps = {
  currency: string
  initial?: Partial<ExpenseInput>
  costDefaults?: ExpenseCostDefaultsMap | null
  onSubmit: (data: ExpenseInput) => Promise<any>
  onSuccess?: () => void
  onCancel?: () => void
  onDirtyChange?: (dirty: boolean) => void
  className?: string
}

export function ExpenseForm({
  currency,
  initial,
  costDefaults,
  onSubmit,
  onSuccess,
  onCancel,
  onDirtyChange,
  className,
}: ExpenseFormProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const defaults = parseExpenseCostDefaults(costDefaults ?? {})
  const initialCategory = (initial?.category as ExpenseCategory) || 'OTHER'
  const initialSubcategory = (initial?.subcategory as ExpenseSubcategory | null) ?? null
  const initialCostType =
    (initial?.costType as ExpenseCostType | undefined) ||
    suggestCostType(initialCategory, initialSubcategory, defaults) ||
    'OVERHEAD'

  const form = useForm<any>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      date: todayInputValue(),
      category: 'OTHER',
      description: '',
      amount: '0',
      paymentMethod: 'CASH',
      vendor: '',
      reference: '',
      notes: '',
      ...initial,
      costType: initial?.costType || initialCostType,
      subcategory: initial?.subcategory ?? null,
    },
  })

  const category = form.watch('category') as ExpenseCategory
  const subcategory = form.watch('subcategory') as ExpenseSubcategory | null

  useEffect(() => {
    onDirtyChange?.(form.formState.isDirty)
  }, [form.formState.isDirty, onDirtyChange])

  const skipSuggest = useRef(true)
  useEffect(() => {
    if (skipSuggest.current) {
      skipSuggest.current = false
      return
    }
    if (category !== 'TRANSPORT') {
      if (form.getValues('subcategory')) {
        form.setValue('subcategory', null, { shouldDirty: true })
      }
      const suggested = suggestCostType(category, null, defaults)
      if (suggested) {
        form.setValue('costType', suggested, { shouldValidate: true, shouldDirty: true })
      }
      return
    }
    const suggested = suggestCostType('TRANSPORT', subcategory, defaults)
    if (suggested) {
      form.setValue('costType', suggested, { shouldValidate: true, shouldDirty: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, subcategory])

  const submit = (data: ExpenseInput) =>
    startTransition(async () => {
      const result = await onSubmit(data)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success(result.message ?? 'Expense saved')
      if (onSuccess) {
        onSuccess()
        router.refresh()
        return
      }
      router.push('/expenses')
      router.refresh()
    })

  return (
    <form onSubmit={form.handleSubmit(submit)} className={cn('space-y-5', className)}>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Date" error={String(form.formState.errors.date?.message ?? '')}>
          <Input type="date" {...form.register('date')} />
        </Field>
        <Field label="Category" error={String(form.formState.errors.category?.message ?? '')}>
          <select
            className="h-10 w-full rounded-md border bg-transparent px-3"
            {...form.register('category')}
          >
            {EXPENSE_CATEGORIES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {category === 'TRANSPORT' ? (
        <Field
          label="Transport type"
          error={String(form.formState.errors.subcategory?.message ?? '')}
        >
          <select
            className="h-10 w-full rounded-md border bg-transparent px-3"
            {...form.register('subcategory')}
          >
            <option value="">Select transport type…</option>
            {TRANSPORT_SUBCATEGORIES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-zinc-500">
            Inward → Production · Customer Delivery → Selling · General → Overhead
          </p>
        </Field>
      ) : null}

      <Field
        label="Cost Type"
        error={String(form.formState.errors.costType?.message ?? '')}
      >
        <select
          className="h-10 w-full rounded-md border bg-transparent px-3"
          {...form.register('costType')}
          disabled={category === 'TRANSPORT'}
        >
          {EXPENSE_COST_TYPES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        {category === 'TRANSPORT' ? (
          <p className="text-xs text-zinc-500">
            Cost type is set automatically from the transport type.
          </p>
        ) : (
          <p className="text-xs text-zinc-500">
            Suggested from category — you can change it if needed.
          </p>
        )}
      </Field>

      <Field
        label="Description"
        error={String(form.formState.errors.description?.message ?? '')}
      >
        <Input placeholder="What was this expense for?" {...form.register('description')} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label={`Amount (${currency})`}
          error={String(form.formState.errors.amount?.message ?? '')}
        >
          <CurrencyInput
            currency={currency}
            value={form.watch('amount')}
            onChange={(value) =>
              form.setValue('amount', value, { shouldValidate: true, shouldDirty: true })
            }
          />
        </Field>
        <Field label="Payment method">
          <select
            className="h-10 w-full rounded-md border bg-transparent px-3"
            {...form.register('paymentMethod')}
          >
            {PAYMENT_METHODS.map((method) => (
              <option key={method.value} value={method.value}>
                {method.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Vendor (optional)">
          <Input {...form.register('vendor')} placeholder="Supplier or vendor" />
        </Field>
        <Field label="Reference (optional)">
          <Input {...form.register('reference')} placeholder="Invoice or receipt no." />
        </Field>
      </div>
      <Field label="Notes">
        <Textarea {...form.register('notes')} />
      </Field>
      <div className="flex justify-end gap-3 border-t border-zinc-100 pt-4">
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => (onCancel ? onCancel() : router.back())}
        >
          Cancel
        </Button>
        <Button disabled={pending}>{pending ? 'Saving…' : 'Save expense'}</Button>
      </div>
    </form>
  )
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
