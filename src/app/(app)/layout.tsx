import { AppShell } from '@/components/layout/app-shell'
import { requireProfile } from '@/lib/auth'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireProfile()
  return (
    <AppShell ownerName={profile.ownerName} email={profile.email}>
      {children}
    </AppShell>
  )
}
