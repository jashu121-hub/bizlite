'use client'

import Link from 'next/link'

import { AccountRowActions } from '@/app/(app)/cash-bank/account-actions'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { ResponsiveDataTable } from '@/components/shared/responsive-data-table'
import { cashAccountTypeLabel } from '@/lib/cash-accounts'
import { cn } from '@/lib/utils'

export type CashAccountRow = {
  id: string
  name: string
  type: string
  bankName: string | null
  accountNumber: string | null
  currentBalance: number
  isActive: boolean
}

export function AccountsTable({
  accounts,
  currency,
}: {
  accounts: CashAccountRow[]
  currency: string
}) {
  return (
    <ResponsiveDataTable
      data={accounts}
      getRowKey={(a) => a.id}
      columns={[
        {
          key: 'name',
          header: 'Account',
          cell: (a) => (
            <div>
              <Link className="font-medium hover:underline" href={`/cash-bank/${a.id}`}>
                {a.name}
              </Link>
              {a.bankName ? (
                <p className="text-xs text-zinc-500">
                  {a.bankName}
                  {a.accountNumber ? ` · ••••${a.accountNumber}` : ''}
                </p>
              ) : null}
            </div>
          ),
        },
        {
          key: 'type',
          header: 'Type',
          cell: (a) => cashAccountTypeLabel(a.type),
        },
        {
          key: 'balance',
          header: 'Balance',
          cell: (a) => <CurrencyDisplay currency={currency} value={a.currentBalance} />,
        },
        {
          key: 'status',
          header: 'Status',
          cell: (a) => (
            <span className={cn(a.isActive ? 'text-emerald-600' : 'text-zinc-500')}>
              {a.isActive ? 'Active' : 'Inactive'}
            </span>
          ),
        },
        {
          key: 'actions',
          header: 'Actions',
          className: 'text-right',
          cell: (a) => <AccountRowActions accountId={a.id} isActive={a.isActive} />,
        },
      ]}
      renderMobileCard={(a) => (
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Link className="font-medium" href={`/cash-bank/${a.id}`}>
                {a.name}
              </Link>
              <p className="text-sm text-zinc-500">{cashAccountTypeLabel(a.type)}</p>
              <CurrencyDisplay currency={currency} value={a.currentBalance} />
            </div>
            <AccountRowActions accountId={a.id} isActive={a.isActive} />
          </div>
        </div>
      )}
      emptyTitle="No cash or bank accounts added yet."
      emptyDescription="Add a cash or bank account to track available funds."
    />
  )
}
