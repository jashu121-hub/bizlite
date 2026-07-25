'use client'

import { DesktopSidebar } from '@/components/layout/desktop-sidebar'
import { MobileBottomNavigation } from '@/components/layout/mobile-bottom-nav'
import { OfflineBanner } from '@/components/shared/offline-banner'
import { cn } from '@/lib/utils'

interface AppShellProps {
  children: React.ReactNode
  className?: string
}

export function AppShell({ children, className }: AppShellProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-zinc-50 dark:bg-zinc-950">
      <OfflineBanner />
      <div className="flex min-h-0 flex-1">
        <DesktopSidebar />
        <main
          className={cn(
            'min-w-0 flex-1 overflow-y-auto',
            'pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0',
            className,
          )}
        >
          <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
      <MobileBottomNavigation />
    </div>
  )
}
