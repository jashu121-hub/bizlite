'use client'

import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { addStartingBalanceAction } from '@/actions/cash-accounts'
import { CurrencyInput } from '@/components/shared/currency-input'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CASH_BALANCE_SOURCES } from '@/lib/cash-accounts'
import { todayInputValue } from '@/lib/dates'
import {
  startingBalanceSchema,
  type StartingBalanceInput,
} from '@/lib/validations/cash-account'

export function StartingBalanceForm({
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
  const form = useForm<StartingBalanceInput>({
    resolver: zodResolver(startingBalanceSchema) as never,
    defaultValues: {
      accountId,
      date: todayInputValue(),
      amount: '',
      balanceSource: undefined as never,
      reference: '',
      notes: '',
    },
  })

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit((data) =>
        startTransition(async () => {
          const result = await addStartingBalanceAction({ ...data, accountId })
          if (!result.success) {
            toast.error(result.error)
            return
          }
          toast.success(result.message ?? 'Starting balance added')
          onDone?.()
          router.refresh()
        }),
      )}
    >
      <div className="space-y-2">
        <Label htmlFor="sb-date">Date</Label>
        <Input id="sb-date" type="date" {...form.register('date')} />
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
        <Label htmlFor="sb-source">Source</Label>
        <select
          id="sb-source"
          className="h-10 w-full rounded-md border bg-transparent px-3"
          value={form.watch('balanceSource') || ''}
          onChange={(e) =>
            form.setValue('balanceSource', e.target.value as StartingBalanceInput['balanceSource'], {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        >
          <option value="" disabled>
            Select source…
          </option>
          {CASH_BALANCE_SOURCES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <p className="text-sm text-red-600" role="alert">
          {String(form.formState.errors.balanceSource?.message ?? '')}
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="sb-ref">Reference</Label>
        <Input id="sb-ref" placeholder="Optional reference" {...form.register('reference')} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="sb-notes">Notes</Label>
        <Textarea id="sb-notes" placeholder="Optional notes" {...form.register('notes')} />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Saving…' : 'Save starting balance'}
      </Button>
    </form>
  )
}
