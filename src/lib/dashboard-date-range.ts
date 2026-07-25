import {
  differenceInCalendarDays,
  endOfDay,
  endOfMonth,
  endOfYear,
  format,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfYear,
  subDays,
  subMonths,
  subYears,
} from 'date-fns'

import type { DateFilterPreset, DateRange } from '@/lib/dates'
import { getDateRange } from '@/lib/dates'

export type DashboardDateRange = {
  periodType: DateFilterPreset
  startDate: Date | null
  endDate: Date | null
  previousStartDate: Date | null
  previousEndDate: Date | null
  displayLabel: string
  salesLabel: string
  expensesLabel: string
  reference: Date
  year: number
  month: number
  customFrom: string | null
  customTo: string | null
  /** True when viewing a non-current inventory snapshot context */
  showStockAsCurrent: boolean
}

export type DashboardDateParams = {
  preset?: string | null
  from?: string | null
  to?: string | null
  year?: string | null
  month?: string | null
}

export type PeriodComparison = {
  percent: number | null
  label: string
  /** favourable = green, unfavourable = red */
  favourable: boolean | null
}

function clampMonth(value: number) {
  if (Number.isNaN(value) || value < 1) return 1
  if (value > 12) return 12
  return Math.floor(value)
}

function buildReference(now: Date, year?: string | null, month?: string | null): Date {
  const y = year ? Number(year) : now.getFullYear()
  const m = month ? clampMonth(Number(month)) : now.getMonth() + 1
  const safeYear = Number.isFinite(y) && y >= 2000 && y <= 2100 ? y : now.getFullYear()
  return new Date(safeYear, m - 1, 1, 12, 0, 0, 0)
}

export function formatDashboardPeriodLabel(
  periodType: DateFilterPreset,
  reference: Date,
  customFrom?: string | null,
  customTo?: string | null,
): string {
  switch (periodType) {
    case 'month':
      return format(reference, 'MMMM yyyy')
    case 'ytd':
      return `YTD ${reference.getFullYear()}`
    case 'year':
      return `Year ${reference.getFullYear()}`
    case 'lifetime':
      return 'Lifetime'
    case 'custom': {
      if (customFrom && customTo) {
        const from = startOfDay(parseISO(customFrom))
        const to = startOfDay(parseISO(customTo))
        return `${format(from, 'd MMMM yyyy')} – ${format(to, 'd MMMM yyyy')}`
      }
      return 'Custom range'
    }
    default:
      return 'Selected period'
  }
}

export function formatPeriodMetricLabel(
  periodType: DateFilterPreset,
  metric: 'sales' | 'expenses',
): string {
  const suffix = metric === 'sales' ? 'Sales' : 'Expenses'
  switch (periodType) {
    case 'month':
      return `This Month ${suffix}`
    case 'ytd':
      return `YTD ${suffix}`
    case 'year':
      return `This Year ${suffix}`
    case 'lifetime':
      return `Lifetime ${suffix}`
    case 'custom':
      return `Selected Period ${suffix}`
    default:
      return `Selected Period ${suffix}`
  }
}

export function getPreviousComparisonRange(
  periodType: DateFilterPreset,
  startDate: Date | null,
  endDate: Date | null,
  reference: Date,
): { previousStartDate: Date | null; previousEndDate: Date | null } {
  if (periodType === 'lifetime' || !startDate || !endDate) {
    return { previousStartDate: null, previousEndDate: null }
  }

  if (periodType === 'month') {
    const prevRef = subMonths(reference, 1)
    return {
      previousStartDate: startOfMonth(prevRef),
      previousEndDate: endOfMonth(prevRef),
    }
  }

  if (periodType === 'ytd') {
    const prevYear = reference.getFullYear() - 1
    const prevStart = startOfYear(new Date(prevYear, 0, 1, 12))
    const prevEnd = endOfDay(
      new Date(prevYear, endDate.getMonth(), endDate.getDate(), 12),
    )
    return { previousStartDate: prevStart, previousEndDate: prevEnd }
  }

  if (periodType === 'year') {
    const prevRef = subYears(reference, 1)
    return {
      previousStartDate: startOfYear(prevRef),
      previousEndDate: endOfYear(prevRef),
    }
  }

  // Custom: immediately preceding range of the same number of days
  const days = differenceInCalendarDays(endDate, startDate) + 1
  const previousEndDate = endOfDay(subDays(startDate, 1))
  const previousStartDate = startOfDay(subDays(previousEndDate, days - 1))
  return { previousStartDate, previousEndDate }
}

export function getDashboardDateRange(
  params: DashboardDateParams,
  now = new Date(),
): DashboardDateRange {
  const periodType = (
    ['month', 'ytd', 'year', 'lifetime', 'custom'] as DateFilterPreset[]
  ).includes(params.preset as DateFilterPreset)
    ? (params.preset as DateFilterPreset)
    : 'month'

  const reference = buildReference(now, params.year, params.month)
  let range: DateRange

  if (periodType === 'custom') {
    range = getDateRange('custom', params.from, params.to, now)
  } else if (periodType === 'lifetime') {
    range = getDateRange('lifetime')
  } else if (periodType === 'ytd') {
    // YTD uses year from reference; end is equivalent cutoff in that year
    const yearStart = startOfYear(reference)
    const sameDayThisYear = new Date(
      reference.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999,
    )
    const end =
      reference.getFullYear() === now.getFullYear()
        ? endOfDay(now)
        : endOfDay(sameDayThisYear)
    range = {
      preset: 'ytd',
      from: yearStart,
      to: end,
      label: formatDashboardPeriodLabel('ytd', reference),
    }
  } else if (periodType === 'year') {
    range = {
      preset: 'year',
      from: startOfYear(reference),
      to: endOfYear(reference),
      label: formatDashboardPeriodLabel('year', reference),
    }
  } else {
    range = {
      preset: 'month',
      from: startOfMonth(reference),
      to: endOfMonth(reference),
      label: formatDashboardPeriodLabel('month', reference),
    }
  }

  const previous = getPreviousComparisonRange(
    periodType,
    range.from,
    range.to,
    reference,
  )

  const isCurrentMonth =
    periodType === 'month' &&
    reference.getFullYear() === now.getFullYear() &&
    reference.getMonth() === now.getMonth()

  return {
    periodType,
    startDate: range.from,
    endDate: range.to,
    previousStartDate: previous.previousStartDate,
    previousEndDate: previous.previousEndDate,
    displayLabel: formatDashboardPeriodLabel(
      periodType,
      reference,
      params.from,
      params.to,
    ),
    salesLabel: formatPeriodMetricLabel(periodType, 'sales'),
    expensesLabel: formatPeriodMetricLabel(periodType, 'expenses'),
    reference,
    year: reference.getFullYear(),
    month: reference.getMonth() + 1,
    customFrom: periodType === 'custom' ? params.from ?? null : null,
    customTo: periodType === 'custom' ? params.to ?? null : null,
    showStockAsCurrent: !isCurrentMonth,
  }
}

export function toDashboardDateRangeCompat(range: DashboardDateRange): DateRange {
  return {
    preset: range.periodType,
    from: range.startDate,
    to: range.endDate,
    label: range.displayLabel,
  }
}

export function comparePeriodValues(
  current: number,
  previous: number | null,
  options?: {
    /** When true, an increase is unfavourable (e.g. expenses) */
    invertFavourable?: boolean
    lifetime?: boolean
  },
): PeriodComparison {
  if (options?.lifetime) {
    return { percent: null, label: 'Lifetime total', favourable: null }
  }

  if (previous === null) {
    return { percent: null, label: 'No previous-period value', favourable: null }
  }

  if (previous === 0 && current === 0) {
    return { percent: 0, label: 'No change', favourable: null }
  }

  if (previous === 0 && current !== 0) {
    return {
      percent: null,
      label: 'New',
      favourable: options?.invertFavourable ? false : current > 0,
    }
  }

  const percent = ((current - previous) / Math.abs(previous)) * 100
  const increased = percent > 0
  const favourable = options?.invertFavourable ? !increased : increased
  const sign = percent > 0 ? '+' : ''
  return {
    percent,
    label: `${sign}${percent.toFixed(0)}% vs last period`,
    favourable,
  }
}

export function toLocalDateInput(date: Date | null | undefined): string {
  if (!date) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function chartGroupingForRange(range: DashboardDateRange): 'day' | 'month' | 'year' {
  if (range.periodType === 'month') return 'day'
  if (range.periodType === 'ytd' || range.periodType === 'year') return 'month'
  if (range.periodType === 'lifetime') {
    if (!range.startDate || !range.endDate) return 'month'
    const days = differenceInCalendarDays(range.endDate, range.startDate) + 1
    return days > 730 ? 'year' : 'month'
  }
  // custom
  if (!range.startDate || !range.endDate) return 'day'
  const days = differenceInCalendarDays(range.endDate, range.startDate) + 1
  if (days <= 62) return 'day'
  if (days > 730) return 'year'
  return 'month'
}
