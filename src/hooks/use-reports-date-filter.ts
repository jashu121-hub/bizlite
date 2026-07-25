'use client'

import { useCallback, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import type { DateFilterPreset } from '@/lib/dates'
import { toLocalDateInput } from '@/lib/dashboard-date-range'

export type ReportsFilterUpdate = {
  preset: DateFilterPreset
  from?: Date | string | null
  to?: Date | string | null
  year?: number | null
  month?: number | null
}

function toParamDate(value: Date | string | null | undefined): string | null {
  if (!value) return null
  if (typeof value === 'string') return value.slice(0, 10)
  return toLocalDateInput(value)
}

export function useReportsDateFilter() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()

  const apply = useCallback(
    (next: ReportsFilterUpdate) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('range', next.preset)

      if (next.preset === 'custom') {
        const from = toParamDate(next.from)
        const to = toParamDate(next.to)
        if (from) params.set('from', from)
        else params.delete('from')
        if (to) params.set('to', to)
        else params.delete('to')
        params.delete('year')
        params.delete('month')
      } else if (next.preset === 'lifetime') {
        params.delete('from')
        params.delete('to')
        params.delete('year')
        params.delete('month')
      } else {
        params.delete('from')
        params.delete('to')
        if (next.year) params.set('year', String(next.year))
        else params.delete('year')
        if (next.preset === 'month' && next.month) params.set('month', String(next.month))
        else params.delete('month')
      }

      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`, { scroll: false })
      })
    },
    [pathname, router, searchParams],
  )

  return { apply, pending, searchParams }
}
