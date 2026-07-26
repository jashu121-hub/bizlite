'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, BookOpen, Calculator, Landmark, LogOut, Settings, Users } from 'lucide-react'

import { InstallAppButton } from '@/components/shared/install-app-button'
import { useLogout } from '@/components/layout/use-logout'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { APP_NAME } from '@/lib/constants'
import { cn } from '@/lib/utils'

const MORE_ITEMS = [
  { href: '/cost-pricing', label: 'Cost & Pricing', icon: Calculator },
  { href: '/cash-bank', label: 'Cash & Bank', icon: Landmark },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/help', label: 'Help & User Manual', icon: BookOpen },
] as const

interface MoreMenuProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MoreMenu({ open, onOpenChange }: MoreMenuProps) {
  const pathname = usePathname()
  const { logout, loading } = useLogout()

  const handleNavigate = () => onOpenChange(false)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <SheetHeader className="text-left">
          <SheetTitle>More</SheetTitle>
          <SheetDescription>Additional {APP_NAME} navigation and actions</SheetDescription>
        </SheetHeader>

        <nav className="mt-4 space-y-1" aria-label="More navigation">
          {MORE_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`)
            return (
              <Link
                key={href}
                href={href}
                prefetch={false}
                onClick={handleNavigate}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors',
                  active
                    ? 'bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                    : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900',
                )}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="mt-4 space-y-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <InstallAppButton className="w-full" />
          <Button
            type="button"
            variant="ghost"
            onClick={() => void logout()}
            disabled={loading}
            className="w-full justify-start gap-3 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
            {loading ? 'Logging out…' : 'Logout'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
