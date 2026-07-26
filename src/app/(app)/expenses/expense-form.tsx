'use client'

import { useEffect, useMemo, useRef, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { ExpenseCostType } from '@prisma/client'

import { FieldHelp } from '@/components/help/field-help'
import { CurrencyInput } from '@/components/shared/currency-input'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { EXPENSE_COST_TYPES, PAYMENT_METHODS } from '@/lib/constants'
import { todayInputValue } from '@/lib/dates'
import { suggestCostType } from '@/lib/expense-cost'
import type { ExpenseCategoryDTO } from '@/lib/expense-categories'
import { expenseSchema, type ExpenseInput } from '@/lib/validations/expense'
import { cn } from '@/lib/utils'

type CashAccountOption = { id: string; name: string; type: string }
type ProductOption = { id: string; name: string }

type ExpenseFormProps = {
  currency: string
  initial?: Partial<ExpenseInput>
  categories: ExpenseCategoryDTO[]
  cashAccounts?: CashAccountOption[]
  products?: ProductOption[]
  onSubmit: (data: ExpenseInput) => Promise<any>
  onSuccess?: () => void
  onCancel?: () => void
  onDirtyChange?: (dirty: boolean) => void
  className?: string
}

export function ExpenseForm({
  currency,
  initial,
  categories,
  cashAccounts = [],
  products = [],
  onSubmit,
  onSuccess,
  onCancel,
  onDirtyChange,
  className,
}: ExpenseFormProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const flat = useMemo(
    () => categories.flatMap((category) => [category, ...(category.children ?? [])]),
    [categories],
  )

  const initialSelected =
    flat.find((category) => category.id === initial?.categoryId) ??
    categories.find((category) => !category.isTransport && !category.isArchived) ??
    categories[0]

  const initialTopLevelId = initialSelected?.parentId
    ? initialSelected.parentId
    : initialSelected?.id ?? ''

  const initialCostType =
    (initial?.costType as ExpenseCostType | undefined) ||
    suggestCostType(initialSelected) ||
    'OVERHEAD'

  const form = useForm<any>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      date: todayInputValue(),
      categoryId: initialSelected?.id ?? '',
      description: '',
      amount: '',
      paymentMethod: 'CASH',
      cashAccountId: '',
      vendor: '',
      reference: '',
      notes: '',
      productId: '',
      productionQuantity: undefined,
      productionUnit: 'pcs',
      productionUnitCost: '',
      inventoryDestination: 'FINISHED_GOODS',
      productionBatch: '',
      updateInventory: false,
      ...initial,
      costType: initial?.costType || initialCostType,
    },
  })

  const categoryId = form.watch('categoryId') as string
  const costType = form.watch('costType') as ExpenseCostType
  const cashAccountId = form.watch('cashAccountId') as string
  const paymentMethod = form.watch('paymentMethod') as string
  const updateInventory = Boolean(form.watch('updateInventory'))
  const isCashOrBank =
    paymentMethod === 'CASH' || paymentMethod === 'BANK_TRANSFER'
  const isUnlinkedCash = !cashAccountId
  const selected = flat.find((item) => item.id === categoryId)
  const topLevelId = selected?.parentId ?? (selected?.isTransport ? selected.id : selected?.id) ?? initialTopLevelId
  const topLevel = categories.find((item) => item.id === topLevelId)
  const transportChildren = (topLevel?.children ?? []).filter((item) => !item.isArchived)
  const isTransport = !!topLevel?.isTransport
  const leafSelected = selected && !selected.isTransport ? selected : null
  const costLocked = !!(leafSelected?.parentId && leafSelected.defaultCostType)

  useEffect(() => {
    onDirtyChange?.(form.formState.isDirty)
  }, [form.formState.isDirty, onDirtyChange])

  const skipSuggest = useRef(true)
  useEffect(() => {
    if (skipSuggest.current) {
      skipSuggest.current = false
      return
    }
    const suggested = suggestCostType(leafSelected)
    if (suggested) {
      form.setValue('costType', suggested, { shouldValidate: true, shouldDirty: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId])

  const submit = (data: ExpenseInput) =>
    startTransition(async () => {
      if (isTransport && (!selected || selected.isTransport)) {
        toast.error('Select Inward Transport, Customer Delivery, or General Transport')
        return
      }
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
        <Field label="Category" error={String(form.formState.errors.categoryId?.message ?? '')}>
          <select
            className="h-10 w-full rounded-md border bg-transparent px-3"
            value={topLevelId}
            onChange={(event) => {
              const next = categories.find((item) => item.id === event.target.value)
              if (!next) return
              if (next.isTransport) {
                form.setValue('categoryId', next.id, { shouldDirty: true, shouldValidate: true })
                return
              }
              form.setValue('categoryId', next.id, { shouldDirty: true, shouldValidate: true })
            }}
          >
            <option value="">Select a category…</option>
            {categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
                {item.isArchived ? ' (archived)' : ''}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {isTransport ? (
        <Field label="Transport type" error={String(form.formState.errors.categoryId?.message ?? '')}>
          <select
            className="h-10 w-full rounded-md border bg-transparent px-3"
            value={selected?.parentId ? selected.id : ''}
            onChange={(event) =>
              form.setValue('categoryId', event.target.value, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
          >
            <option value="">Select transport type…</option>
            {transportChildren.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-zinc-500">
            Inward → Production · Customer Delivery → Selling · General → Overhead
          </p>
        </Field>
      ) : null}

      <Field label="Cost Type" error={String(form.formState.errors.costType?.message ?? '')}>
        <select
          className="h-10 w-full rounded-md border bg-transparent px-3"
          {...form.register('costType')}
          disabled={costLocked}
        >
          {EXPENSE_COST_TYPES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        {costLocked ? (
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
      {cashAccounts.length > 0 ? (
        <Field
          label="Pay from account"
          help={{
            label: 'Payment Account',
            text: 'Select a Cash or Bank account to deduct this expense, or choose Unlinked / Reporting only.',
            guideHref: '/help#cash-and-bank',
          }}
          error={String(form.formState.errors.cashAccountId?.message ?? '')}
        >
          <select
            className="h-10 w-full rounded-md border bg-transparent px-3"
            {...form.register('cashAccountId')}
          >
            <option value="">Unlinked / Reporting only</option>
            {cashAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
          {isUnlinkedCash ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              {isCashOrBank
                ? 'Payment method is Cash/Bank, but this expense is Unlinked / Reporting only. It will be included in reports but will not reduce any Cash & Bank account.'
                : 'This expense will be included in reports but will not reduce any Cash & Bank account.'}
            </p>
          ) : (
            <p className="text-xs text-zinc-500">
              Deducts the expense amount from the selected cash or bank account. Editing reverses the
              previous ledger posting before applying the new one (no duplicate deduction).
            </p>
          )}
        </Field>
      ) : null}

      {costType === 'PRODUCTION' ? (
        <div className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50/60 p-4">
          <div>
            <p className="text-sm font-medium text-zinc-900">Production / inventory link (optional)</p>
            <p className="mt-1 text-xs text-zinc-500">
              Link this production cost to a product and optionally update finished-goods inventory.
              Leave blank for reporting-only production spending.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Related product">
              <select
                className="h-10 w-full rounded-md border bg-white px-3"
                {...form.register('productId')}
              >
                <option value="">No product link</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Quantity produced / purchased">
              <Input
                type="number"
                min={1}
                step={1}
                placeholder="e.g. 15"
                {...form.register('productionQuantity', { valueAsNumber: true })}
              />
            </Field>
            <Field label="Unit">
              <Input placeholder="pcs" {...form.register('productionUnit')} />
            </Field>
            <Field label={`Unit cost (${currency})`}>
              <CurrencyInput
                currency={currency}
                value={form.watch('productionUnitCost') || ''}
                onChange={(value) =>
                  form.setValue('productionUnitCost', value, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
              />
            </Field>
            <Field label="Inventory destination">
              <select
                className="h-10 w-full rounded-md border bg-white px-3"
                {...form.register('inventoryDestination')}
              >
                <option value="FINISHED_GOODS">Finished goods</option>
                <option value="RAW_MATERIALS">Raw materials</option>
                <option value="WIP">Work in progress</option>
                <option value="NONE">None</option>
              </select>
            </Field>
            <Field label="Production batch / reference">
              <Input placeholder="Batch or job ref" {...form.register('productionBatch')} />
            </Field>
          </div>
          <Field label="Update inventory">
            <select
              className="h-10 w-full rounded-md border bg-white px-3"
              value={updateInventory ? 'yes' : 'no'}
              onChange={(event) =>
                form.setValue('updateInventory', event.target.value === 'yes', {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
            {updateInventory ? (
              <p className="text-xs text-zinc-500">
                Yes increases product stock and updates weighted-average costPrice from unit cost (or
                amount ÷ quantity).
              </p>
            ) : null}
          </Field>
        </div>
      ) : null}

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
  help,
}: {
  label: string
  error?: string
  children: React.ReactNode
  help?: { label: string; text: string; guideHref: string }
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Label>{label}</Label>
        {help ? <FieldHelp {...help} /> : null}
      </div>
      {children}
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
