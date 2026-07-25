'use client'

import { DateRangeFilter } from '@/components/shared/date-range-filter'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useDashboardDateFilter } from '@/hooks/use-dashboard-date-filter'
import { getDateRange, type DateFilterPreset, type DateRange } from '@/lib/dates'

export type SerializableDateRange = {
  preset: DateFilterPreset
  label: string
  from: string | null
  to: string | null
  year?: number
  month?: number
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

function toDateRange(value: SerializableDateRange): DateRange {
  if (value.preset === 'custom') {
    return getDateRange('custom', value.from, value.to)
  }
  if (value.preset === 'lifetime') {
    return getDateRange('lifetime')
  }
  const year = value.year ?? new Date().getFullYear()
  const month = value.month ?? new Date().getMonth() + 1
  const reference = new Date(year, month - 1, 1, 12)
  return getDateRange(value.preset, null, null, reference)
}

function yearOptions(currentYear: number) {
  const years: number[] = []
  for (let y = currentYear + 1; y >= currentYear - 6; y -= 1) years.push(y)
  return years
}

export function DashboardDateFilter({ range }: { range: SerializableDateRange }) {
  const { apply, pending } = useDashboardDateFilter()
  const value = toDateRange(range)
  const nowYear = new Date().getFullYear()
  const selectedYear = range.year ?? nowYear
  const selectedMonth = range.month ?? new Date().getMonth() + 1

  const navigation = (() => {
    if (range.preset === 'lifetime') {
      return (
        <p className="text-sm font-medium text-zinc-600" aria-live="polite">
          All Time
        </p>
      )
    }
    if (range.preset === 'custom') {
      return (
        <p className="text-sm text-zinc-500" aria-live="polite">
          {range.label}
        </p>
      )
    }
    if (range.preset === 'month') {
      return (
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={String(selectedMonth)}
            disabled={pending}
            onValueChange={(month) =>
              apply({
                preset: 'month',
                year: selectedYear,
                month: Number(month),
              })
            }
          >
            <SelectTrigger className="h-9 w-[140px]" aria-label="Select month">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((name, index) => (
                <SelectItem key={name} value={String(index + 1)}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(selectedYear)}
            disabled={pending}
            onValueChange={(year) =>
              apply({
                preset: 'month',
                year: Number(year),
                month: selectedMonth,
              })
            }
          >
            <SelectTrigger className="h-9 w-[100px]" aria-label="Select year">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions(nowYear).map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )
    }

    // YTD / This Year — year selector
    return (
      <div className="flex items-center gap-2">
        <p className="text-sm text-zinc-500">
          {range.preset === 'ytd' ? 'YTD' : 'Year'}
        </p>
        <Select
          value={String(selectedYear)}
          disabled={pending}
          onValueChange={(year) =>
            apply({
              preset: range.preset,
              year: Number(year),
            })
          }
        >
          <SelectTrigger className="h-9 w-[100px]" aria-label="Select year">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {yearOptions(nowYear).map((year) => (
              <SelectItem key={year} value={String(year)}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  })()

  return (
    <DateRangeFilter
      value={value}
      displayLabel={range.label}
      navigation={navigation}
      disabled={pending}
      className={pending ? 'opacity-70' : undefined}
      onChange={(next) => {
        if (next.preset === 'custom') {
          apply({
            preset: 'custom',
            from: next.from,
            to: next.to,
          })
          return
        }
        if (next.preset === 'lifetime') {
          apply({ preset: 'lifetime' })
          return
        }
        apply({
          preset: next.preset,
          year: selectedYear,
          month: next.preset === 'month' ? selectedMonth : undefined,
        })
      }}
    />
  )
}
