'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import * as React from 'react'
import {
  LayoutDashboard,
  Receipt,
  Wallet,
  Package,
  MoreHorizontal,
} from 'lucide-react'

import { MoreMenu } from '@/components/layout/more-menu'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/sales', label: 'Sales', icon: Receipt },
  { href: '/expenses', label: 'Expenses', icon: Wallet },
  { href: '/products', label: 'Products', icon: Package },
] as const

interface MobileBottomNavigationProps {
  className?: string
}

export function MobileBottomNavigation({ className }: MobileBottomNavigationProps) {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = React.useState(false)

  const moreActive =
    pathname.startsWith('/cost-pricing') ||
    pathname.startsWith('/cash-bank') ||
    pathname.startsWith('/customers') ||
    pathname.startsWith('/reports') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/help')

  return (
    <>
      <nav
        className={cn(
          'fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:border-zinc-800 dark:bg-zinc-950/95 md:hidden',
          className,
        )}
        aria-label="Mobile navigation"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="mx-auto flex h-16 max-w-lg items-stretch justify-around px-2">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`)
            return (
              <Link
                key={href}
                href={href}
                prefetch={false}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 text-xs font-medium transition-colors',
                  active
                    ? 'text-teal-700 dark:text-teal-400'
                    : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50',
                )}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span className="truncate">{label}</span>
              </Link>
            )
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-current={moreActive ? 'page' : undefined}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            className={cn(
              'flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 text-xs font-medium transition-colors',
              moreActive
                ? 'text-teal-700 dark:text-teal-400'
                : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50',
            )}
          >
            <MoreHorizontal className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span>More</span>
          </button>
        </div>
      </nav>

      <MoreMenu open={moreOpen} onOpenChange={setMoreOpen} />
    </>
  )
}
