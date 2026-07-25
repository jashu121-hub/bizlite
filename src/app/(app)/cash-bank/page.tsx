import Link from 'next/link'
import { Landmark, Plus } from 'lucide-react'

import { AccountsTable } from '@/app/(app)/cash-bank/accounts-table'
import { PageHeader } from '@/components/shared/page-header'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { requireProfile } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { moneyNumber } from '@/lib/money'

export default async function CashBankPage() {
  const { user, profile } = await requireProfile()
  const accounts = await prisma.cashAccount.findMany({
    where: { userId: user.id },
    orderBy: [{ type: 'asc' }, { name: 'asc' }],
  })

  const cashBalance = accounts
    .filter((a) => a.type === 'CASH' && a.isActive)
    .reduce((sum, a) => sum + moneyNumber(a.currentBalance), 0)
  const bankBalance = accounts
    .filter((a) => a.type === 'BANK' && a.isActive)
    .reduce((sum, a) => sum + moneyNumber(a.currentBalance), 0)
  const otherBalance = accounts
    .filter((a) => a.type === 'OTHER' && a.isActive)
    .reduce((sum, a) => sum + moneyNumber(a.currentBalance), 0)
  const total = cashBalance + bankBalance + otherBalance

  const rows = accounts.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    bankName: a.bankName,
    accountNumber: a.accountNumber,
    currentBalance: moneyNumber(a.currentBalance),
    isActive: a.isActive,
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cash & Bank"
        description="Track cash on hand and bank account balances."
        actions={
          accounts.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href="/cash-bank/new?type=CASH">
                  <Plus className="h-4 w-4" />
                  Add Cash
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/cash-bank/new?type=BANK">
                  <Plus className="h-4 w-4" />
                  Add Bank
                </Link>
              </Button>
              <Button asChild>
                <Link href="/cash-bank/new?type=OTHER">
                  <Plus className="h-4 w-4" />
                  Add Account
                </Link>
              </Button>
            </div>
          ) : null
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Cash Balance" value={cashBalance} currency={profile.currency} />
        <SummaryCard label="Bank Balance" value={bankBalance} currency={profile.currency} />
        <SummaryCard
          label="Total Available Funds"
          value={total}
          currency={profile.currency}
          emphasize
        />
      </div>

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 px-6 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-700">
              <Landmark className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">
                No cash or bank accounts added yet.
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Add accounts manually. Nothing is created automatically and no sample balances are
                added.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link href="/cash-bank/new?type=CASH">Add Cash Account</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/cash-bank/new?type=BANK">Add Bank Account</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/cash-bank/new?type=OTHER">Add Other Account</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <AccountsTable accounts={rows} currency={profile.currency} />
      )}
    </div>
  )
}

function SummaryCard({
  label,
  value,
  currency,
  emphasize,
}: {
  label: string
  value: number
  currency: string
  emphasize?: boolean
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-zinc-500">{label}</p>
        <p className={emphasize ? 'mt-1 text-xl font-bold text-zinc-900' : 'mt-1 text-lg font-semibold'}>
          <CurrencyDisplay currency={currency} value={value} />
        </p>
      </CardContent>
    </Card>
  )
}
