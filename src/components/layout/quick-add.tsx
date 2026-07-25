'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import * as React from 'react'
import {
  Package,
  Plus,
  ShoppingCart,
  UserPlus,
  Wallet,
  X,
} from 'lucide-react'

import { cn } from '@/lib/utils'

const ACTIONS = [
  {
    href: '/sales/new',
    label: 'New Sale',
    icon: ShoppingCart,
  },
  {
    href: '/expenses/new',
    label: 'Add Expense',
    icon: Wallet,
  },
  {
    href: '/products/new',
    label: 'New Product',
    icon: Package,
  },
  {
    href: '/customers/new',
    label: 'New Customer',
    icon: UserPlus,
  },
] as const

const VISIBLE_PREFIXES = [
  '/dashboard',
  '/sales',
  '/expenses',
  '/products',
  '/customers',
  '/reports',
] as const

function shouldShowOnPath(pathname: string) {
  const allowed = VISIBLE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
  if (!allowed) return false
  if (pathname.includes('/new') || pathname.includes('/edit')) return false
  return true
}

function isBlockingOverlayOpen() {
  if (typeof document === 'undefined') return false
  return Boolean(
    document.querySelector(
      [
        '[role="dialog"][data-state="open"]',
        '[role="alertdialog"][data-state="open"]',
        '[data-radix-dialog-overlay][data-state="open"]',
      ].join(','),
    ),
  )
}

export function QuickAdd() {
  const pathname = usePathname()
  const [open, setOpen] = React.useState(false)
  const [overlayOpen, setOverlayOpen] = React.useState(false)
  const rootRef = React.useRef<HTMLDivElement>(null)
  const buttonRef = React.useRef<HTMLButtonElement>(null)
  const itemRefs = React.useRef<Array<HTMLAnchorElement | null>>([])

  const visible = shouldShowOnPath(pathname) && !overlayOpen

  React.useEffect(() => {
    setOpen(false)
  }, [pathname])

  React.useEffect(() => {
    if (overlayOpen) setOpen(false)
  }, [overlayOpen])

  React.useEffect(() => {
    const sync = () => setOverlayOpen(isBlockingOverlayOpen())
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ['data-state', 'class', 'style'],
    })
    return () => observer.disconnect()
  }, [])

  React.useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
        buttonRef.current?.focus()
        return
      }

      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        const items = itemRefs.current.filter(Boolean) as HTMLAnchorElement[]
        if (items.length === 0) return
        const currentIndex = items.findIndex((el) => el === document.activeElement)
        const nextIndex =
          event.key === 'ArrowDown'
            ? (currentIndex + 1 + items.length) % items.length
            : (currentIndex - 1 + items.length) % items.length
        items[nextIndex]?.focus()
      }
    }

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node
      if (rootRef.current && !rootRef.current.contains(target)) {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
    }
  }, [open])

  React.useEffect(() => {
    if (open) {
      requestAnimationFrame(() => {
        itemRefs.current[0]?.focus()
      })
    }
  }, [open])

  if (!visible) return null

  function toggle() {
    setOpen((prev) => {
      const next = !prev
      if (!next) {
        requestAnimationFrame(() => buttonRef.current?.focus())
      }
      return next
    })
  }

  return (
    <div
      ref={rootRef}
      className={cn(
        'pointer-events-none fixed z-[45] flex flex-col items-end gap-3',
        // Desktop / tablet
        'md:bottom-6 md:right-6',
        // Mobile: sit above bottom nav + safe area
        'bottom-[calc(4.5rem+0.75rem+env(safe-area-inset-bottom,0px))] right-4',
      )}
    >
      <div
        id="quick-add-menu"
        role="menu"
        aria-label="Quick add actions"
        className={cn(
          'pointer-events-auto flex w-[min(calc(100vw-2rem),15.5rem)] flex-col gap-2 transition duration-150 ease-out',
          open
            ? 'translate-y-0 scale-100 opacity-100'
            : 'pointer-events-none translate-y-2 scale-95 opacity-0',
        )}
      >
        {ACTIONS.map(({ href, label, icon: Icon }, index) => (
          <Link
            key={href}
            href={href}
            role="menuitem"
            tabIndex={open ? 0 : -1}
            ref={(node) => {
              itemRefs.current[index] = node
            }}
            onClick={() => {
              setOpen(false)
            }}
            className={cn(
              'flex min-h-11 items-center gap-3 rounded-xl border border-zinc-200/80 bg-white px-3.5 py-2.5 text-sm font-medium text-zinc-800 shadow-md',
              'transition hover:border-teal-300 hover:bg-teal-50/60 hover:text-teal-900',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2',
            )}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <span>{label}</span>
          </Link>
        ))}
      </div>

      <button
        ref={buttonRef}
        type="button"
        title="Quick Add"
        aria-label={open ? 'Close quick actions' : 'Open quick actions'}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="quick-add-menu"
        onClick={toggle}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            toggle()
          }
        }}
        className={cn(
          'pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#0f766e] text-white shadow-lg shadow-teal-900/20',
          'transition hover:-translate-y-0.5 hover:bg-[#0d6a63] hover:shadow-xl',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2',
          open && 'bg-[#0d6a63]',
        )}
      >
        {open ? (
          <X className="h-6 w-6" aria-hidden="true" />
        ) : (
          <Plus className="h-6 w-6" aria-hidden="true" />
        )}
      </button>
    </div>
  )
}
