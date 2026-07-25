'use client'

import { useRouter, useSearchParams } from 'next/navigation'

import { DateRangeFilter } from '@/components/shared/date-range-filter'
import { getDateRange, type DateFilterPreset, type DateRange } from '@/lib/dates'

export type SerializableDateRange = {
  preset: DateFilterPreset
  label: string
  from: string | null
  to: string | null
}

function toDateRange(value: SerializableDateRange): DateRange {
  if (value.preset === 'custom') {
    return getDateRange('custom', value.from, value.to)
  }
  return getDateRange(value.preset)
}

export function DashboardDateFilter({ range }: { range: SerializableDateRange }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const value = toDateRange(range)

  return (
    <DateRangeFilter
      value={value}
      onChange={(next) => {
        const params = new URLSearchParams(searchParams)
        params.set('preset', next.preset)
        if (next.preset === 'custom' && next.from) {
          params.set('from', next.from.toISOString().slice(0, 10))
        } else {
          params.delete('from')
        }
        if (next.preset === 'custom' && next.to) {
          params.set('to', next.to.toISOString().slice(0, 10))
        } else {
          params.delete('to')
        }
        router.push(`/dashboard?${params}`)
      }}
    />
  )
}
