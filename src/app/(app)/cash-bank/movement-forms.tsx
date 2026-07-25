'use client'

import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import {
  adjustCashBalanceAction,
  recordMoneyInAction,
  recordMoneyOutAction,
  transferCashAction,
} from '@/actions/cash-accounts'
import { CurrencyInput } from '@/components/shared/currency-input'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { todayInputValue } from '@/lib/dates'
import {
  balanceAdjustmentSchema,
  moneyMovementSchema,
  transferSchema,
  type BalanceAdjustmentInput,
  type MoneyMovementInput,
  type TransferInput,
} from '@/lib/validations/cash-account'

function MoneyFields({
  form,
  currency,
  pending,
  submitLabel,
}: {
  form: ReturnType<typeof useForm<MoneyMovementInput>>
  currency: string
  pending: boolean
  submitLabel: string
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="mv-date">Date</Label>
        <Input id="mv-date" type="date" {...form.register('date')} />
      </div>
      <div className="space-y-2">
        <Label>Amount</Label>
        <CurrencyInput
          currency={currency}
          value={form.watch('amount')}
          onChange={(value) =>
            form.setValue('amount', value, { shouldDirty: true, shouldValidate: true })
          }
          placeholder="0.00"
        />
        <p className="text-sm text-red-600" role="alert">
          {String(form.formState.errors.amount?.message ?? '')}
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="mv-ref">Reference</Label>
        <Input id="mv-ref" placeholder="Optional reference" {...form.register('reference')} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="mv-notes">Notes</Label>
        <Textarea id="mv-notes" placeholder="Optional notes" {...form.register('notes')} />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Saving…' : submitLabel}
      </Button>
    </>
  )
}

export function MoneyInForm({
  accountId,
  currency,
  onDone,
}: {
  accountId: string
  currency: string
  onDone?: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const form = useForm<MoneyMovementInput>({
    resolver: zodResolver(moneyMovementSchema) as never,
    defaultValues: {
      accountId,
      date: todayInputValue(),
      amount: '',
      reference: '',
      notes: '',
    },
  })

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit((data) =>
        startTransition(async () => {
          const result = await recordMoneyInAction({ ...data, accountId })
          if (!result.success) {
            toast.error(result.error)
            return
          }
          toast.success(result.message ?? 'Money in recorded')
          onDone?.()
          router.refresh()
        }),
      )}
    >
      <MoneyFields form={form} currency={currency} pending={pending} submitLabel="Record money in" />
    </form>
  )
}

export function MoneyOutForm({
  accountId,
  currency,
  onDone,
}: {
  accountId: string
  currency: string
  onDone?: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const form = useForm<MoneyMovementInput>({
    resolver: zodResolver(moneyMovementSchema) as never,
    defaultValues: {
      accountId,
      date: todayInputValue(),
      amount: '',
      reference: '',
      notes: '',
    },
  })

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit((data) =>
        startTransition(async () => {
          const result = await recordMoneyOutAction({ ...data, accountId })
          if (!result.success) {
            toast.error(result.error)
            return
          }
          toast.success(result.message ?? 'Money out recorded')
          onDone?.()
          router.refresh()
        }),
      )}
    >
      <MoneyFields form={form} currency={currency} pending={pending} submitLabel="Record money out" />
    </form>
  )
}

export function TransferForm({
  fromAccountId,
  accounts,
  currency,
  onDone,
}: {
  fromAccountId: string
  accounts: { id: string; name: string }[]
  currency: string
  onDone?: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const form = useForm<TransferInput>({
    resolver: zodResolver(transferSchema) as never,
    defaultValues: {
      fromAccountId,
      toAccountId: '',
      date: todayInputValue(),
      amount: '',
      reference: '',
      notes: '',
    },
  })

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit((data) =>
        startTransition(async () => {
          const result = await transferCashAction({ ...data, fromAccountId })
          if (!result.success) {
            toast.error(result.error)
            return
          }
          toast.success(result.message ?? 'Transfer completed')
          onDone?.()
          router.refresh()
        }),
      )}
    >
      <div className="space-y-2">
        <Label htmlFor="to-account">To account</Label>
        <select
          id="to-account"
          className="h-10 w-full rounded-md border bg-transparent px-3"
          value={form.watch('toAccountId')}
          onChange={(e) =>
            form.setValue('toAccountId', e.target.value, { shouldDirty: true, shouldValidate: true })
          }
        >
          <option value="">Select account…</option>
          {accounts
            .filter((a) => a.id !== fromAccountId)
            .map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
        </select>
        <p className="text-sm text-red-600" role="alert">
          {String(form.formState.errors.toAccountId?.message ?? '')}
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="tr-date">Date</Label>
        <Input id="tr-date" type="date" {...form.register('date')} />
      </div>
      <div className="space-y-2">
        <Label>Transfer amount</Label>
        <CurrencyInput
          currency={currency}
          value={form.watch('amount')}
          onChange={(value) =>
            form.setValue('amount', value, { shouldDirty: true, shouldValidate: true })
          }
          placeholder="0.00"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="tr-ref">Reference</Label>
        <Input id="tr-ref" placeholder="Optional reference" {...form.register('reference')} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="tr-notes">Notes</Label>
        <Textarea id="tr-notes" placeholder="Optional notes" {...form.register('notes')} />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Saving…' : 'Transfer'}
      </Button>
    </form>
  )
}

export function AdjustBalanceForm({
  accountId,
  currency,
  onDone,
}: {
  accountId: string
  currency: string
  onDone?: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const form = useForm<BalanceAdjustmentInput>({
    resolver: zodResolver(balanceAdjustmentSchema) as never,
    defaultValues: {
      accountId,
      date: todayInputValue(),
      amount: '',
      direction: 'IN',
      reference: '',
      notes: '',
    },
  })

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit((data) =>
        startTransition(async () => {
          const result = await adjustCashBalanceAction({ ...data, accountId })
          if (!result.success) {
            toast.error(result.error)
            return
          }
          toast.success(result.message ?? 'Balance adjusted')
          onDone?.()
          router.refresh()
        }),
      )}
    >
      <div className="space-y-2">
        <Label htmlFor="adj-dir">Direction</Label>
        <select
          id="adj-dir"
          className="h-10 w-full rounded-md border bg-transparent px-3"
          {...form.register('direction')}
        >
          <option value="IN">Increase</option>
          <option value="OUT">Decrease</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="adj-date">Date</Label>
        <Input id="adj-date" type="date" {...form.register('date')} />
      </div>
      <div className="space-y-2">
        <Label>Amount</Label>
        <CurrencyInput
          currency={currency}
          value={form.watch('amount')}
          onChange={(value) =>
            form.setValue('amount', value, { shouldDirty: true, shouldValidate: true })
          }
          placeholder="0.00"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="adj-notes">Notes</Label>
        <Textarea id="adj-notes" placeholder="Optional notes" {...form.register('notes')} />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Saving…' : 'Save adjustment'}
      </Button>
    </form>
  )
}
