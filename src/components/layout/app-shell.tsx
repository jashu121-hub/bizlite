'use client'

import { DesktopSidebar } from '@/components/layout/desktop-sidebar'
import { MobileBottomNavigation } from '@/components/layout/mobile-bottom-nav'
import { QuickAdd } from '@/components/layout/quick-add'
import { QuickAddProvider } from '@/components/layout/quick-add-context'
import { OfflineBanner } from '@/components/shared/offline-banner'
import { APP_NAME } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface AppShellProps {
  children: React.ReactNode
  className?: string
  ownerName?: string | null
  email?: string | null
  currency: string
}

export function AppShell({
  children,
  className,
  ownerName,
  email,
  currency,
}: AppShellProps) {
  return (
    <QuickAddProvider currency={currency}>
      <div className="flex h-screen w-full max-w-none overflow-hidden bg-[#f3f6f5]">
        <DesktopSidebar ownerName={ownerName} email={email} />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <OfflineBanner />
          <main
            className={cn(
              'min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto',
              'pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0',
              className,
            )}
          >
            <div className="w-full min-w-0 max-w-none px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
              {children}
            </div>
            <footer className="px-4 pb-6 text-center text-xs text-zinc-400 md:pb-8">
              © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
            </footer>
          </main>
        </div>

        <QuickAdd />
        <MobileBottomNavigation />
      </div>
    </QuickAddProvider>
  )
}
