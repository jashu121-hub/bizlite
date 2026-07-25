'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { DateRangeFilter } from '@/components/shared/date-range-filter'
import type { DateRange } from '@/lib/dates'

export function DashboardDateFilter({ range }: { range: DateRange }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  return <DateRangeFilter value={range} onChange={(next) => {
    const params = new URLSearchParams(searchParams)
    params.set('preset', next.preset)
    if (next.from) params.set('from', next.from.toISOString().slice(0, 10)); else params.delete('from')
    if (next.to) params.set('to', next.to.toISOString().slice(0, 10)); else params.delete('to')
    router.push(`/dashboard?${params}`)
  }} />
}
