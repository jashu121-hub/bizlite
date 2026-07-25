import { AppShell } from '@/components/layout/app-shell'
import { requireProfile } from '@/lib/auth'
import { parseExpenseCostDefaults } from '@/lib/expense-cost'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireProfile()
  return (
    <AppShell
      ownerName={profile.ownerName}
      email={profile.email}
      currency={profile.currency}
      expenseCostDefaults={parseExpenseCostDefaults(profile.expenseCostDefaults)}
    >
      {children}
    </AppShell>
  )
}
