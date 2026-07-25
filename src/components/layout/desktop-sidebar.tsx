'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import * as React from 'react'
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Receipt,
  Wallet,
  Package,
  Users,
  BarChart3,
  Settings,
  LogOut,
} from 'lucide-react'

import { useLogout } from '@/components/layout/use-logout'
import { Button } from '@/components/ui/button'
import { APP_NAME } from '@/lib/constants'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/sales', label: 'Sales', icon: Receipt },
  { href: '/expenses', label: 'Expenses', icon: Wallet },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
] as const

interface DesktopSidebarProps {
  className?: string
}

export function DesktopSidebar({ className }: DesktopSidebarProps) {
  const pathname = usePathname()
  const { logout, loading } = useLogout()
  const [collapsed, setCollapsed] = React.useState(false)

  return (
    <aside
      className={cn(
        'hidden h-full flex-col border-r border-zinc-200 bg-white transition-[width] duration-200 dark:border-zinc-800 dark:bg-zinc-950 md:flex',
        collapsed ? 'w-[4.5rem]' : 'w-64',
        className,
      )}
    >
      <div className="flex h-14 items-center justify-between border-b border-zinc-200 px-3 dark:border-zinc-800">
        {!collapsed ? (
          <Link href="/dashboard" className="truncate px-2 text-lg font-semibold text-teal-700">
            {APP_NAME}
          </Link>
        ) : (
          <Link
            href="/dashboard"
            className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-teal-700 text-sm font-bold text-white"
            aria-label={APP_NAME}
          >
            B
          </Link>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="shrink-0"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-2" aria-label="Main navigation">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`)
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50',
                collapsed && 'justify-center px-2',
              )}
              title={collapsed ? label : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              {!collapsed ? <span>{label}</span> : null}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-zinc-200 p-2 dark:border-zinc-800">
        <Button
          type="button"
          variant="ghost"
          onClick={() => void logout()}
          disabled={loading}
          className={cn(
            'w-full justify-start gap-3 text-zinc-600 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400',
            collapsed && 'justify-center px-2',
          )}
          aria-label="Log out"
        >
          <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
          {!collapsed ? <span>{loading ? 'Logging out…' : 'Logout'}</span> : null}
        </Button>
      </div>
    </aside>
  )
}
