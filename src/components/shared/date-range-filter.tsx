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
  /** Optional period label override shown beside the dropdown */
  displayLabel?: string
  /** Extra controls (month/year navigation) rendered after the label */
  navigation?: React.ReactNode
  disabled?: boolean
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

export function DateRangeFilter({
  value,
  onChange,
  className,
  displayLabel,
  navigation,
  disabled,
}: DateRangeFilterProps) {
  const [uiPreset, setUiPreset] = React.useState<DateFilterPreset>(value.preset)
  const [customFrom, setCustomFrom] = React.useState(() => toInputDate(value.from))
  const [customTo, setCustomTo] = React.useState(() => toInputDate(value.to))
  const appliedCustom = React.useRef({
    from: toInputDate(value.from),
    to: toInputDate(value.to),
  })

  React.useEffect(() => {
    setUiPreset(value.preset)
    if (value.preset === 'custom') {
      const from = toInputDate(value.from)
      const to = toInputDate(value.to)
      setCustomFrom(from)
      setCustomTo(to)
      appliedCustom.current = { from, to }
    }
  }, [value])

  const handlePresetChange = (preset: DateFilterPreset) => {
    setUiPreset(preset)
    if (preset === 'custom') {
      const from = customFrom || toInputDate(new Date())
      const to = customTo || from
      setCustomFrom(from)
      setCustomTo(to)
      return
    }
    onChange(getDateRange(preset))
  }

  const applyCustomRange = () => {
    if (!customFrom || !customTo) return
    if (customTo < customFrom) return
    appliedCustom.current = { from: customFrom, to: customTo }
    onChange(getDateRange('custom', customFrom, customTo))
  }

  const cancelCustom = () => {
    setCustomFrom(appliedCustom.current.from)
    setCustomTo(appliedCustom.current.to)
    setUiPreset(value.preset)
  }

  const clearCustom = () => {
    setCustomFrom('')
    setCustomTo('')
  }

  const label = displayLabel ?? value.label
  const showCustom = uiPreset === 'custom'

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">Date range</span>
        </div>
        <Select
          value={uiPreset}
          onValueChange={(v) => handlePresetChange(v as DateFilterPreset)}
          disabled={disabled}
        >
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
        {showCustom ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400" aria-live="polite">
            {value.preset === 'custom' ? label : 'Select dates and Apply'}
          </p>
        ) : (
          navigation ?? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400" aria-live="polite">
              {label}
            </p>
          )
        )}
      </div>

      {showCustom ? (
        <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-[140px] flex-1 space-y-2">
            <Label htmlFor="date-from">From</Label>
            <Input
              id="date-from"
              type="date"
              value={customFrom}
              disabled={disabled}
              onChange={(e) => {
                const next = e.target.value
                setCustomFrom(next)
                if (customTo && next && customTo < next) setCustomTo(next)
              }}
            />
          </div>
          <div className="min-w-[140px] flex-1 space-y-2">
            <Label htmlFor="date-to">To</Label>
            <Input
              id="date-to"
              type="date"
              value={customTo}
              min={customFrom || undefined}
              disabled={disabled}
              onChange={(e) => setCustomTo(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={applyCustomRange}
              disabled={disabled || !customFrom || !customTo || customTo < customFrom}
              className="shrink-0"
            >
              Apply
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={cancelCustom}
              disabled={disabled}
              className="shrink-0"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={clearCustom}
              disabled={disabled}
              className="shrink-0"
            >
              Clear
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
