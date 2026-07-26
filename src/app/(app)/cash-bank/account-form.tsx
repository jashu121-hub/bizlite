'use client'

import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { createCashAccountAction, updateCashAccountAction } from '@/actions/cash-accounts'
import { FieldHelp } from '@/components/help/field-help'
import { CurrencyInput } from '@/components/shared/currency-input'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CASH_ACCOUNT_TYPES, CASH_BALANCE_SOURCES } from '@/lib/cash-accounts'
import { APP_NAME } from '@/lib/constants'
import { todayInputValue } from '@/lib/dates'
import {
  createCashAccountSchema,
  updateCashAccountSchema,
  type UpdateCashAccountInput,
} from '@/lib/validations/cash-account'

type CreateProps = {
  mode: 'create'
  currency: string
  defaultType?: 'CASH' | 'BANK' | 'OTHER'
}

type EditProps = {
  mode: 'edit'
  currency: string
  accountId: string
  initial: UpdateCashAccountInput
}

export function CashAccountForm(props: CreateProps | EditProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const isEdit = props.mode === 'edit'

  const form = useForm<any>({
    resolver: zodResolver(isEdit ? updateCashAccountSchema : createCashAccountSchema),
    defaultValues: isEdit
      ? props.initial
      : {
          name: '',
          type: props.defaultType ?? 'CASH',
          bankName: '',
          accountNumber: '',
          openingBalance: '',
          openingBalanceDate: '',
          balanceSource: '',
          notes: '',
        },
  })

  const type = form.watch('type') as string
  const openingBalance = (form.watch('openingBalance') as string) || ''
  const showOpeningFields = !isEdit && openingBalance !== '' && Number(openingBalance) > 0

  const onSubmit = form.handleSubmit((data) =>
    startTransition(async () => {
      if (isEdit) {
        const result = await updateCashAccountAction(props.accountId, data)
        if (!result.success) {
          toast.error(result.error)
          return
        }
        toast.success(result.message ?? 'Account updated')
        router.push(`/cash-bank/${props.accountId}`)
        router.refresh()
        return
      }

      if (data.openingBalance && Number(data.openingBalance) > 0 && !data.openingBalanceDate) {
        data.openingBalanceDate = todayInputValue()
      }
      const result = await createCashAccountAction(data)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success(result.message ?? 'Account created')
      router.push(`/cash-bank/${result.data?.id}`)
      router.refresh()
    }),
  )

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="account-name">Account name</Label>
          <Input id="account-name" placeholder="Enter account name" {...form.register('name')} />
          <p className="text-sm text-red-600" role="alert">
            {String(form.formState.errors.name?.message ?? '')}
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="account-type">Account type</Label>
          <select
            id="account-type"
            className="h-10 w-full rounded-md border bg-transparent px-3"
            {...form.register('type')}
          >
            {CASH_ACCOUNT_TYPES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {type === 'BANK' || type === 'OTHER' ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="bank-name">Bank name</Label>
            <Input id="bank-name" placeholder="Enter bank name" {...form.register('bankName')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="account-number">Account number or last four digits</Label>
            <Input
              id="account-number"
              placeholder="Last four digits"
              {...form.register('accountNumber')}
            />
          </div>
        </div>
      ) : null}

      {!isEdit ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Label>Opening balance (optional)</Label>
                <FieldHelp
                  label="Opening Balance"
                  text={`The amount already in this account before you start using ${APP_NAME}. Leave empty if you are not sure.`}
                  guideHref="/help#cash-and-bank"
                />
              </div>
              <CurrencyInput
                currency={props.currency}
                value={openingBalance}
                onChange={(value) =>
                  form.setValue('openingBalance', value, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                placeholder="0.00"
              />
              <p className="text-xs text-zinc-500">
                Leave empty to start at zero with no opening transaction.
              </p>
            </div>
            {showOpeningFields ? (
              <div className="space-y-2">
                <Label htmlFor="opening-date">Opening balance date</Label>
                <Input id="opening-date" type="date" {...form.register('openingBalanceDate')} />
                <p className="text-sm text-red-600" role="alert">
                  {String(form.formState.errors.openingBalanceDate?.message ?? '')}
                </p>
              </div>
            ) : null}
          </div>
          {showOpeningFields ? (
            <div className="space-y-2">
              <Label htmlFor="balance-source">Balance source</Label>
              <select
                id="balance-source"
                className="h-10 w-full rounded-md border bg-transparent px-3"
                {...form.register('balanceSource')}
              >
                <option value="">Select source…</option>
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
          ) : null}
        </>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            className="h-10 w-full rounded-md border bg-transparent px-3"
            value={form.watch('isActive') ? 'active' : 'inactive'}
            onChange={(e) =>
              form.setValue('isActive', e.target.value === 'active', { shouldDirty: true })
            }
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <p className="text-xs text-zinc-500">
            Balance cannot be edited here. Use Add Starting Balance, Money In/Out, Transfer, or
            Adjustment.
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" placeholder="Optional notes" {...form.register('notes')} />
      </div>

      <div className="flex justify-end gap-3 border-t border-zinc-100 pt-4">
        <Button type="button" variant="outline" disabled={pending} onClick={() => router.back()}>
          Cancel
        </Button>
        <Button disabled={pending}>
          {pending ? 'Saving…' : isEdit ? 'Save changes' : 'Save account'}
        </Button>
      </div>
    </form>
  )
}
