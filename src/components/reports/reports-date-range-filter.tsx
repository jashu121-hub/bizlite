'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { DateRangeFilter } from '@/components/shared/date-range-filter'
import { getDateRange, type DateFilterPreset, type DateRange } from '@/lib/dates'

export type SerializableDateRange = {
  preset: DateFilterPreset
  label: string
  from: string | null
  to: string | null
}

interface ReportsDateRangeFilterProps {
  value: SerializableDateRange
}

function toDateRange(value: SerializableDateRange): DateRange {
  if (value.preset === 'custom') {
    return getDateRange('custom', value.from, value.to)
  }
  return getDateRange(value.preset)
}

export function ReportsDateRangeFilter({ value }: ReportsDateRangeFilterProps) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const range = toDateRange(value)

  const updateRange = (next: DateRange) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('range', next.preset)
    if (next.preset === 'custom') {
      if (next.from) params.set('from', next.from.toISOString().slice(0, 10))
      else params.delete('from')
      if (next.to) params.set('to', next.to.toISOString().slice(0, 10))
      else params.delete('to')
    } else {
      params.delete('from')
      params.delete('to')
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  return <DateRangeFilter value={range} onChange={updateRange} />
}
