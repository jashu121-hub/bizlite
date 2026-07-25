import { PageHeader } from '@/components/shared/page-header'
import { requireProfile } from '@/lib/auth'
import { CashAccountForm } from '../account-form'

export default async function NewCashAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>
}) {
  const { profile } = await requireProfile()
  const params = await searchParams
  const type =
    params.type === 'BANK' || params.type === 'OTHER' || params.type === 'CASH'
      ? params.type
      : 'CASH'

  const titles = {
    CASH: 'Add Cash Account',
    BANK: 'Add Bank Account',
    OTHER: 'Add Other Account',
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title={titles[type]}
        description="Enter account details manually. Opening balance is optional."
      />
      <CashAccountForm mode="create" currency={profile.currency} defaultType={type} />
    </div>
  )
}
