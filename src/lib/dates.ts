import {
  endOfDay,
  endOfMonth,
  endOfYear,
  format,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfYear,
} from 'date-fns'

export type DateFilterPreset = 'month' | 'ytd' | 'year' | 'lifetime' | 'custom'

export interface DateRange {
  from: Date | null
  to: Date | null
  preset: DateFilterPreset
  label: string
}

export function getDateRange(
  preset: DateFilterPreset,
  customFrom?: string | null,
  customTo?: string | null,
  reference = new Date(),
): DateRange {
  switch (preset) {
    case 'month':
      return {
        preset,
        from: startOfMonth(reference),
        to: endOfMonth(reference),
        label: format(reference, 'MMMM yyyy'),
      }
    case 'ytd':
      return {
        preset,
        from: startOfYear(reference),
        to: endOfDay(reference),
        label: `YTD ${reference.getFullYear()}`,
      }
    case 'year':
      return {
        preset,
        from: startOfYear(reference),
        to: endOfYear(reference),
        label: `Year ${reference.getFullYear()}`,
      }
    case 'custom': {
      const from = customFrom ? startOfDay(parseISO(customFrom)) : null
      const to = customTo ? endOfDay(parseISO(customTo)) : null
      return {
        preset,
        from,
        to,
        label:
          from && to
            ? `${format(from, 'd MMMM yyyy')} – ${format(to, 'd MMMM yyyy')}`
            : 'Custom range',
      }
    }
    case 'lifetime':
    default:
      return { preset: 'lifetime', from: null, to: null, label: 'Lifetime' }
  }
}

export function toDateOnly(date: Date | string): Date {
  if (typeof date === 'string') {
    return startOfDay(parseISO(date.length === 10 ? `${date}T12:00:00` : date))
  }
  return startOfDay(date)
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'dd MMM yyyy')
}

export function todayInputValue(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function prismaDateFilter(range: DateRange) {
  if (!range.from && !range.to) return undefined
  return {
    gte: range.from ?? undefined,
    lte: range.to ?? undefined,
  }
}
