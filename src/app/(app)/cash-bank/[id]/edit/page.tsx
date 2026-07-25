import { notFound } from 'next/navigation'

import { CashAccountForm } from '@/app/(app)/cash-bank/account-form'
import { PageHeader } from '@/components/shared/page-header'
import { requireProfile } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function EditCashAccountPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { user, profile } = await requireProfile()
  const account = await prisma.cashAccount.findFirst({ where: { id, userId: user.id } })
  if (!account) notFound()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title={`Edit ${account.name}`}
        description="Update account details. Balance changes are made through transactions."
      />
      <CashAccountForm
        mode="edit"
        currency={profile.currency}
        accountId={account.id}
        initial={{
          name: account.name,
          type: account.type,
          bankName: account.bankName ?? '',
          accountNumber: account.accountNumber ?? '',
          notes: account.notes ?? '',
          isActive: account.isActive,
        }}
      />
    </div>
  )
}
