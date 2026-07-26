import { ExpenseCategoryManager } from '@/components/settings/expense-categories/ExpenseCategoryManager'
import { ResetBusinessDataCard } from '@/components/settings/reset-business-data'
import { SettingsForm } from '@/components/settings/settings-form'
import { PageHeader } from '@/components/shared/page-header'
import { DEFAULT_CURRENCY } from '@/lib/constants'
import { requireProfile } from '@/lib/auth'
import { listExpenseCategories } from '@/lib/expense-categories'

export default async function SettingsPage() {
  const { profile, user } = await requireProfile()
  const categories = await listExpenseCategories(user.id, { includeArchived: true })

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
          costingMode: profile.costingMode === 'SIMPLE' ? 'SIMPLE' : 'INVENTORY',
        }}
      />
      <ExpenseCategoryManager
        initialCategories={categories}
        currency={profile.currency ?? DEFAULT_CURRENCY}
      />
      <ResetBusinessDataCard />
    </div>
  )
}
