import { notFound } from 'next/navigation'

import { AccountDetailActions } from '@/app/(app)/cash-bank/account-actions'
import { PageHeader } from '@/components/shared/page-header'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { Card, CardContent } from '@/components/ui/card'
import { requireProfile } from '@/lib/auth'
import {
  cashAccountTypeLabel,
  cashBalanceSourceLabel,
  cashTransactionTypeLabel,
} from '@/lib/cash-accounts'
import { formatDate } from '@/lib/dates'
import { moneyNumber } from '@/lib/money'
import { prisma } from '@/lib/prisma'
import { cn } from '@/lib/utils'

export default async function CashAccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { user, profile } = await requireProfile()
  const [account, allAccounts] = await Promise.all([
    prisma.cashAccount.findFirst({
      where: { id, userId: user.id },
      include: {
        transactions: { orderBy: [{ date: 'desc' }, { createdAt: 'desc' }], take: 100 },
      },
    }),
    prisma.cashAccount.findMany({
      where: { userId: user.id, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])
  if (!account) notFound()

  return (
    <div className="space-y-6">
      <PageHeader
        title={account.name}
        description={`${cashAccountTypeLabel(account.type)}${
          account.bankName ? ` · ${account.bankName}` : ''
        }${account.accountNumber ? ` · ••••${account.accountNumber}` : ''}`}
      />

      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-zinc-500">Current balance</p>
            <p className="text-2xl font-bold">
              <CurrencyDisplay currency={profile.currency} value={account.currentBalance} />
            </p>
            <p className={cn('mt-1 text-sm', account.isActive ? 'text-emerald-600' : 'text-zinc-500')}>
              {account.isActive ? 'Active' : 'Inactive'}
            </p>
          </div>
          <AccountDetailActions
            accountId={account.id}
            currency={profile.currency}
            isActive={account.isActive}
            transferAccounts={allAccounts}
          />
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Transactions</h2>
        {account.transactions.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-zinc-500">
              No transactions yet. Use Add Starting Balance or Money In to fund this account.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="divide-y p-0">
              {account.transactions.map((tx) => {
                const amount = moneyNumber(tx.amount)
                return (
                  <div
                    key={tx.id}
                    className="flex items-start justify-between gap-3 px-4 py-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{cashTransactionTypeLabel(tx.type)}</p>
                      <p className="text-zinc-500">
                        {formatDate(tx.date)}
                        {tx.balanceSource
                          ? ` · ${cashBalanceSourceLabel(tx.balanceSource)}`
                          : ''}
                        {tx.reference ? ` · ${tx.reference}` : ''}
                      </p>
                      {tx.notes ? <p className="text-zinc-500">{tx.notes}</p> : null}
                    </div>
                    <p
                      className={cn(
                        'shrink-0 font-semibold tabular-nums',
                        amount >= 0 ? 'text-emerald-700' : 'text-red-600',
                      )}
                    >
                      {amount >= 0 ? '+' : ''}
                      <CurrencyDisplay currency={profile.currency} value={amount} />
                    </p>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
