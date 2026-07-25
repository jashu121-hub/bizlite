'use client'

import * as React from 'react'
import { CalendarDays } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getDateRange, type DateFilterPreset, type DateRange } from '@/lib/dates'
import { cn } from '@/lib/utils'

interface DateRangeFilterProps {
  value: DateRange
  onChange: (range: DateRange) => void
  className?: string
}

const PRESETS: { value: DateFilterPreset; label: string }[] = [
  { value: 'month', label: 'This Month' },
  { value: 'ytd', label: 'YTD' },
  { value: 'year', label: 'This Year' },
  { value: 'lifetime', label: 'Lifetime' },
  { value: 'custom', label: 'Custom Range' },
]

function toInputDate(date: Date | null): string {
  if (!date) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function DateRangeFilter({ value, onChange, className }: DateRangeFilterProps) {
  const [customFrom, setCustomFrom] = React.useState(() => toInputDate(value.from))
  const [customTo, setCustomTo] = React.useState(() => toInputDate(value.to))

  React.useEffect(() => {
    if (value.preset === 'custom') {
      setCustomFrom(toInputDate(value.from))
      setCustomTo(toInputDate(value.to))
    }
  }, [value])

  const handlePresetChange = (preset: DateFilterPreset) => {
    if (preset === 'custom') {
      onChange(getDateRange('custom', customFrom || null, customTo || null))
      return
    }
    onChange(getDateRange(preset))
  }

  const applyCustomRange = () => {
    onChange(getDateRange('custom', customFrom || null, customTo || null))
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">Date range</span>
        </div>
        <Select value={value.preset} onValueChange={(v) => handlePresetChange(v as DateFilterPreset)}>
          <SelectTrigger className="w-full sm:w-[200px]" aria-label="Date range preset">
            <SelectValue placeholder="Select range" />
          </SelectTrigger>
          <SelectContent>
            {PRESETS.map((preset) => (
              <SelectItem key={preset.value} value={preset.value}>
                {preset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-zinc-500 dark:text-zinc-400" aria-live="polite">
          {value.label}
        </p>
      </div>

      {value.preset === 'custom' ? (
        <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="date-from">From</Label>
            <Input
              id="date-from"
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
            />
          </div>
          <div className="flex-1 space-y-2">
            <Label htmlFor="date-to">To</Label>
            <Input
              id="date-to"
              type="date"
              value={customTo}
              min={customFrom || undefined}
              onChange={(e) => setCustomTo(e.target.value)}
            />
          </div>
          <Button type="button" onClick={applyCustomRange} className="shrink-0">
            Apply
          </Button>
        </div>
      ) : null}
    </div>
  )
}
