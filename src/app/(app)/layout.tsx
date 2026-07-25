import { AppShell } from '@/components/layout/app-shell'
import { requireProfile } from '@/lib/auth'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireProfile()
  return <AppShell>{children}</AppShell>
}
