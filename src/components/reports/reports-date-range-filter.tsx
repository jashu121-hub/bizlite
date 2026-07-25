'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { DateRangeFilter } from '@/components/shared/date-range-filter'
import type { DateRange } from '@/lib/dates'

interface ReportsDateRangeFilterProps {
  value: DateRange
}

export function ReportsDateRangeFilter({ value }: ReportsDateRangeFilterProps) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  const updateRange = (range: DateRange) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('range', range.preset)
    if (range.preset === 'custom') {
      if (range.from) params.set('from', range.from.toISOString().slice(0, 10))
      else params.delete('from')
      if (range.to) params.set('to', range.to.toISOString().slice(0, 10))
      else params.delete('to')
    } else {
      params.delete('from')
      params.delete('to')
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  return <DateRangeFilter value={value} onChange={updateRange} />
}
