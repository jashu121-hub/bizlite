'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Receipt,
  Wallet,
  Package,
  Users,
  BarChart3,
  Settings,
  LogOut,
  HelpCircle,
} from 'lucide-react'

import { useLogout } from '@/components/layout/use-logout'
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

export function DesktopSidebar({
  ownerName,
  email,
}: {
  ownerName?: string | null
  email?: string | null
}) {
  const pathname = usePathname()
  const { logout, loading } = useLogout()
  const displayName = ownerName?.trim() || 'Demo User'
  const displayEmail = email?.trim() || 'demo@bizlite.app'

  return (
    <aside className="hidden h-screen w-[260px] shrink-0 flex-col bg-[#0b3d38] text-white md:flex">
      <div className="flex shrink-0 items-center gap-3 px-5 py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-lg font-bold">
          B
        </div>
        <div className="min-w-0">
          <p className="truncate text-lg font-bold tracking-tight">{APP_NAME}</p>
          <p className="truncate text-xs text-emerald-100/70">Business made simple.</p>
        </div>
      </div>

      <nav
        className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-3 pb-4 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-track]:bg-transparent"
        aria-label="Main navigation"
      >
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`)
          return (
            <Link
              key={href}
              href={href}
              prefetch={false}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-white text-[#0b3d38] shadow-sm'
                  : 'text-emerald-50/80 hover:bg-white/10 hover:text-white',
              )}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto shrink-0 space-y-3 px-3 pb-4 pt-2">
        <div className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-400/20 text-sm font-bold text-emerald-100">
              {displayName.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{displayName}</p>
              <p className="truncate text-xs text-emerald-100/60">{displayEmail}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm font-medium text-emerald-50 hover:bg-white/15 disabled:opacity-60"
          >
            <LogOut className="h-4 w-4" />
            {loading ? 'Logging out…' : 'Logout'}
          </button>
        </div>

        <p className="flex items-center justify-center gap-1 px-2 text-[11px] text-emerald-100/40">
          <HelpCircle className="h-3 w-3" />
          Need help? Check Settings
        </p>
      </div>
    </aside>
  )
}
