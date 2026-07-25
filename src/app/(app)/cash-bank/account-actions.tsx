'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Pencil, PlusCircle, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, SlidersHorizontal } from 'lucide-react'
import { toast } from 'sonner'

import { setCashAccountActiveAction } from '@/actions/cash-accounts'
import { StartingBalanceForm } from '@/app/(app)/cash-bank/starting-balance-form'
import {
  AdjustBalanceForm,
  MoneyInForm,
  MoneyOutForm,
  TransferForm,
} from '@/app/(app)/cash-bank/movement-forms'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export function AccountRowActions({
  accountId,
  isActive,
}: {
  accountId: string
  isActive: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <div className="flex justify-end gap-1">
      <Button asChild variant="ghost" size="icon">
        <Link href={`/cash-bank/${accountId}`}>
          <span className="sr-only">View transactions</span>
          <ArrowLeftRight className="h-4 w-4" />
        </Link>
      </Button>
      <Button asChild variant="ghost" size="icon">
        <Link href={`/cash-bank/${accountId}/edit`}>
          <Pencil className="h-4 w-4" />
          <span className="sr-only">Edit</span>
        </Link>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await setCashAccountActiveAction(accountId, !isActive)
            if (!result.success) {
              toast.error(result.error)
              return
            }
            toast.success(result.message)
            router.refresh()
          })
        }
      >
        {isActive ? 'Mark inactive' : 'Activate'}
      </Button>
    </div>
  )
}

export function AccountDetailActions({
  accountId,
  currency,
  isActive,
  transferAccounts,
}: {
  accountId: string
  currency: string
  isActive: boolean
  transferAccounts: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [open, setOpen] = useState<string | null>(null)

  const close = () => setOpen(null)

  return (
    <div className="flex flex-wrap gap-2">
      <Dialog open={open === 'starting'} onOpenChange={(v) => setOpen(v ? 'starting' : null)}>
        <DialogTrigger asChild>
          <Button type="button" variant="default">
            <PlusCircle className="h-4 w-4" />
            Add Starting Balance
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Starting Balance</DialogTitle>
          </DialogHeader>
          <StartingBalanceForm accountId={accountId} currency={currency} onDone={close} />
        </DialogContent>
      </Dialog>

      <Dialog open={open === 'in'} onOpenChange={(v) => setOpen(v ? 'in' : null)}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline">
            <ArrowDownLeft className="h-4 w-4" />
            Money In
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Money In</DialogTitle>
          </DialogHeader>
          <MoneyInForm accountId={accountId} currency={currency} onDone={close} />
        </DialogContent>
      </Dialog>

      <Dialog open={open === 'out'} onOpenChange={(v) => setOpen(v ? 'out' : null)}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline">
            <ArrowUpRight className="h-4 w-4" />
            Money Out
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Money Out</DialogTitle>
          </DialogHeader>
          <MoneyOutForm accountId={accountId} currency={currency} onDone={close} />
        </DialogContent>
      </Dialog>

      <Dialog open={open === 'transfer'} onOpenChange={(v) => setOpen(v ? 'transfer' : null)}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" disabled={transferAccounts.length < 2}>
            <ArrowLeftRight className="h-4 w-4" />
            Transfer
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transfer</DialogTitle>
          </DialogHeader>
          <TransferForm
            fromAccountId={accountId}
            accounts={transferAccounts}
            currency={currency}
            onDone={close}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={open === 'adjust'} onOpenChange={(v) => setOpen(v ? 'adjust' : null)}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline">
            <SlidersHorizontal className="h-4 w-4" />
            Adjust
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Balance Adjustment</DialogTitle>
          </DialogHeader>
          <AdjustBalanceForm accountId={accountId} currency={currency} onDone={close} />
        </DialogContent>
      </Dialog>

      <Button asChild variant="outline">
        <Link href={`/cash-bank/${accountId}/edit`}>
          <Pencil className="h-4 w-4" />
          Edit
        </Link>
      </Button>

      <Button
        type="button"
        variant="ghost"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await setCashAccountActiveAction(accountId, !isActive)
            if (!result.success) {
              toast.error(result.error)
              return
            }
            toast.success(result.message)
            router.refresh()
          })
        }
      >
        {isActive ? 'Mark Inactive' : 'Activate'}
      </Button>
    </div>
  )
}
