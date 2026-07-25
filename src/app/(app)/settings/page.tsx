import { ExpenseCostDefaultsForm } from '@/components/settings/expense-cost-defaults-form'
import { SettingsForm } from '@/components/settings/settings-form'
import { PageHeader } from '@/components/shared/page-header'
import { DEFAULT_CURRENCY } from '@/lib/constants'
import { requireProfile } from '@/lib/auth'
import { parseExpenseCostDefaults } from '@/lib/expense-cost'

export default async function SettingsPage() {
  const { profile } = await requireProfile()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your business profile, preferences, and account."
      />
      <SettingsForm
        defaultValues={{
          businessName: profile.businessName ?? '',
          ownerName: profile.ownerName ?? '',
          phone: profile.phone ?? '',
          currency: profile.currency ?? DEFAULT_CURRENCY,
        }}
      />
      <ExpenseCostDefaultsForm
        initialDefaults={parseExpenseCostDefaults(profile.expenseCostDefaults)}
      />
    </div>
  )
}
