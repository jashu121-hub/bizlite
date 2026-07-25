'use client'

import { DesktopSidebar } from '@/components/layout/desktop-sidebar'
import { MobileBottomNavigation } from '@/components/layout/mobile-bottom-nav'
import { OfflineBanner } from '@/components/shared/offline-banner'
import { cn } from '@/lib/utils'

interface AppShellProps {
  children: React.ReactNode
  className?: string
  ownerName?: string | null
  email?: string | null
}

export function AppShell({ children, className, ownerName, email }: AppShellProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-[#f3f6f5]">
      <OfflineBanner />
      <div className="flex min-h-0 flex-1">
        <DesktopSidebar ownerName={ownerName} email={email} />
        <main
          className={cn(
            'min-w-0 flex-1 overflow-y-auto',
            'pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0',
            className,
          )}
        >
          <div className="mx-auto w-full max-w-[1400px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
            {children}
          </div>
          <footer className="px-4 pb-6 text-center text-xs text-zinc-400 md:pb-8">
            © {new Date().getFullYear()} BizLite. All rights reserved.
          </footer>
        </main>
      </div>
      <MobileBottomNavigation />
    </div>
  )
}
