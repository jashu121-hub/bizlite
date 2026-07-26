'use client'

import * as React from 'react'
import {
  ArrowUp,
  BarChart3,
  BookOpen,
  Calculator,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  HelpCircle,
  Landmark,
  LayoutDashboard,
  List,
  Package,
  Pencil,
  PlusCircle,
  Printer,
  Receipt,
  Rocket,
  Search,
  Settings,
  TrendingUp,
  Users,
  Wallet,
  X,
} from 'lucide-react'

import { BusinessProfileCard } from '@/components/help/business-profile-card'
import { ManualBlocks } from '@/components/help/manual-blocks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  flattenSectionText,
  MANUAL_SECTIONS,
} from '@/lib/help/manual-sections'
import type { BusinessProfileManualData, ManualIconName, ManualSection } from '@/lib/help/types'
import { APP_NAME } from '@/lib/constants'
import { cn } from '@/lib/utils'

const ICON_MAP: Record<ManualIconName, React.ComponentType<{ className?: string }>> = {
  book: BookOpen,
  rocket: Rocket,
  layout: LayoutDashboard,
  plus: PlusCircle,
  receipt: Receipt,
  wallet: Wallet,
  package: Package,
  calculator: Calculator,
  users: Users,
  landmark: Landmark,
  'bar-chart': BarChart3,
  settings: Settings,
  edit: Pencil,
  trending: TrendingUp,
  help: HelpCircle,
}

function sectionMatches(section: ManualSection, query: string) {
  if (!query.trim()) return true
  return flattenSectionText(section).toLowerCase().includes(query.trim().toLowerCase())
}

function scrollToSection(slug: string) {
  const el = document.getElementById(slug)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  history.replaceState(null, '', `#${slug}`)
}

export function ManualView({ profile }: { profile: BusinessProfileManualData }) {
  const [query, setQuery] = React.useState('')
  const [openMap, setOpenMap] = React.useState<Record<string, boolean>>(() =>
    Object.fromEntries(MANUAL_SECTIONS.map((s) => [s.slug, true])),
  )
  const [mobileTocOpen, setMobileTocOpen] = React.useState(false)
  const [showBackTop, setShowBackTop] = React.useState(false)
  const [activeSlug, setActiveSlug] = React.useState(MANUAL_SECTIONS[0]?.slug ?? '')

  const filtered = React.useMemo(
    () => MANUAL_SECTIONS.filter((section) => sectionMatches(section, query)),
    [query],
  )

  React.useEffect(() => {
    const onScroll = () => {
      const main = document.querySelector('main')
      const top = main?.scrollTop ?? window.scrollY
      setShowBackTop(top > 400)

      let current = MANUAL_SECTIONS[0]?.slug ?? ''
      for (const section of MANUAL_SECTIONS) {
        const el = document.getElementById(section.slug)
        if (!el) continue
        const rect = el.getBoundingClientRect()
        if (rect.top <= 140) current = section.slug
      }
      setActiveSlug(current)
    }

    const main = document.querySelector('main')
    main?.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => {
      main?.removeEventListener('scroll', onScroll)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  React.useEffect(() => {
    const hash = window.location.hash.replace('#', '')
    if (!hash) return
    const timer = window.setTimeout(() => scrollToSection(hash), 80)
    setOpenMap((prev) => ({ ...prev, [hash]: true }))
    return () => window.clearTimeout(timer)
  }, [])

  const expandAll = () =>
    setOpenMap(Object.fromEntries(MANUAL_SECTIONS.map((s) => [s.slug, true])))
  const collapseAll = () =>
    setOpenMap(Object.fromEntries(MANUAL_SECTIONS.map((s) => [s.slug, false])))

  const goAdjacent = (slug: string, direction: -1 | 1) => {
    const index = MANUAL_SECTIONS.findIndex((s) => s.slug === slug)
    const next = MANUAL_SECTIONS[index + direction]
    if (!next) return
    setOpenMap((prev) => ({ ...prev, [next.slug]: true }))
    scrollToSection(next.slug)
  }

  return (
    <div className="manual-print-root space-y-5">
      <header className="space-y-4 rounded-2xl border border-teal-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800">
              <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
              Help & User Manual
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
              {APP_NAME} User Manual
            </h1>
            <p className="text-sm text-zinc-500 sm:text-base">
              A simple guide to managing your business
            </p>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            <Button type="button" variant="outline" size="sm" onClick={expandAll}>
              <ChevronsUpDown className="h-4 w-4" />
              Expand All
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={collapseAll}>
              <ChevronsDownUp className="h-4 w-4" />
              Collapse All
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              Print Manual
            </Button>
          </div>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the user manual"
            aria-label="Search the user manual"
            className="h-11 pl-10 pr-10"
          />
          {query ? (
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              onClick={() => setQuery('')}
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        {query.trim() ? (
          <p className="text-xs text-zinc-500">
            Showing {filtered.length} of {MANUAL_SECTIONS.length} sections
          </p>
        ) : null}
      </header>

      <div className="print:hidden lg:hidden">
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between"
          onClick={() => setMobileTocOpen((v) => !v)}
          aria-expanded={mobileTocOpen}
        >
          <span className="inline-flex items-center gap-2">
            <List className="h-4 w-4" />
            Table of contents
          </span>
          <ChevronDown
            className={cn('h-4 w-4 transition-transform', mobileTocOpen && 'rotate-180')}
          />
        </Button>
        {mobileTocOpen ? (
          <nav className="mt-2 rounded-xl border border-zinc-200 bg-white p-2 shadow-sm" aria-label="Manual sections">
            {MANUAL_SECTIONS.map((section) => {
              const Icon = ICON_MAP[section.icon]
              const match = sectionMatches(section, query)
              return (
                <button
                  key={section.slug}
                  type="button"
                  disabled={!match}
                  onClick={() => {
                    setOpenMap((prev) => ({ ...prev, [section.slug]: true }))
                    setMobileTocOpen(false)
                    scrollToSection(section.slug)
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm',
                    activeSlug === section.slug
                      ? 'bg-teal-50 font-medium text-teal-900'
                      : 'text-zinc-700 hover:bg-zinc-50',
                    !match && 'opacity-40',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0 text-teal-700" />
                  <span className="min-w-0 truncate">{section.title}</span>
                </button>
              )
            })}
          </nav>
        ) : null}
      </div>

      <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="print:hidden hidden lg:block">
          <div className="sticky top-4 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
            <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Contents
            </p>
            <nav className="space-y-0.5" aria-label="Manual sections">
              {MANUAL_SECTIONS.map((section) => {
                const Icon = ICON_MAP[section.icon]
                const match = sectionMatches(section, query)
                return (
                  <button
                    key={section.slug}
                    type="button"
                    disabled={!match}
                    onClick={() => {
                      setOpenMap((prev) => ({ ...prev, [section.slug]: true }))
                      scrollToSection(section.slug)
                    }}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                      activeSlug === section.slug
                        ? 'bg-teal-50 font-medium text-teal-900'
                        : 'text-zinc-700 hover:bg-zinc-50',
                      !match && 'opacity-40',
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-teal-700" />
                    <span className="min-w-0 leading-snug">{section.title}</span>
                  </button>
                )
              })}
            </nav>
          </div>
        </aside>

        <div className="min-w-0 space-y-4">
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500">
              No sections match “{query}”. Try keywords like “add sale”, “cash account”, or “profit”.
            </div>
          ) : null}

          {filtered.map((section) => {
            const Icon = ICON_MAP[section.icon]
            const open = openMap[section.slug] ?? true
            const fullIndex = MANUAL_SECTIONS.findIndex((s) => s.slug === section.slug)
            const prev = MANUAL_SECTIONS[fullIndex - 1]
            const next = MANUAL_SECTIONS[fullIndex + 1]

            return (
              <section
                key={section.slug}
                id={section.slug}
                className="scroll-mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
              >
                <button
                  type="button"
                  className="flex w-full items-start gap-3 px-4 py-4 text-left sm:px-5"
                  onClick={() =>
                    setOpenMap((prevMap) => ({
                      ...prevMap,
                      [section.slug]: !open,
                    }))
                  }
                  aria-expanded={open}
                >
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-800">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-lg font-semibold text-zinc-900">{section.title}</span>
                    <span className="mt-0.5 block text-sm text-zinc-500">{section.summary}</span>
                  </span>
                  <ChevronDown
                    className={cn(
                      'mt-1 h-5 w-5 shrink-0 text-zinc-400 transition-transform print:hidden',
                      open && 'rotate-180',
                    )}
                  />
                </button>

                {open ? (
                  <div className="space-y-5 border-t border-zinc-100 px-4 py-5 sm:px-5">
                    <ManualBlocks blocks={section.content} query={query} />
                    {section.id === 'about' ? <BusinessProfileCard profile={profile} /> : null}

                    <div className="flex flex-wrap gap-2 border-t border-zinc-100 pt-4 print:hidden">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!prev}
                        onClick={() => goAdjacent(section.slug, -1)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!next}
                        onClick={() => goAdjacent(section.slug, 1)}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : null}
              </section>
            )
          })}
        </div>
      </div>

      {showBackTop ? (
        <button
          type="button"
          onClick={() => {
            const main = document.querySelector('main')
            if (main) main.scrollTo({ top: 0, behavior: 'smooth' })
            else window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          className="print:hidden fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-30 inline-flex h-11 items-center gap-2 rounded-full bg-teal-700 px-4 text-sm font-medium text-white shadow-lg hover:bg-teal-800 md:bottom-6"
          aria-label="Back to top"
        >
          <ArrowUp className="h-4 w-4" />
          Back to Top
        </button>
      ) : null}
    </div>
  )
}
