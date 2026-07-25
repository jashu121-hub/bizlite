'use client'

import * as React from 'react'

import { Input } from '@/components/ui/input'
import { DEFAULT_CURRENCY } from '@/lib/constants'
import { moneyString, type MoneyInput } from '@/lib/money'
import { cn } from '@/lib/utils'

interface CurrencyInputProps {
  value: MoneyInput
  onChange: (value: string) => void
  currency?: string
  id?: string
  name?: string
  placeholder?: string
  disabled?: boolean
  required?: boolean
  className?: string
  'aria-label'?: string
}

function sanitizeCurrencyInput(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, '')
  const parts = cleaned.split('.')
  if (parts.length <= 1) return cleaned
  return `${parts[0]}.${parts.slice(1).join('').slice(0, 2)}`
}

export function CurrencyInput({
  value,
  onChange,
  currency = DEFAULT_CURRENCY,
  id,
  name,
  placeholder = '0.00',
  disabled,
  required,
  className,
  'aria-label': ariaLabel,
}: CurrencyInputProps) {
  const [display, setDisplay] = React.useState(() => moneyString(value))
  const isFocused = React.useRef(false)

  React.useEffect(() => {
    if (!isFocused.current) {
      setDisplay(moneyString(value))
    }
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = sanitizeCurrencyInput(e.target.value)
    setDisplay(next)
    onChange(next === '' ? '0' : next)
  }

  const handleBlur = () => {
    isFocused.current = false
    const normalized = moneyString(display)
    setDisplay(normalized)
    onChange(normalized)
  }

  const handleFocus = () => {
    isFocused.current = true
  }

  return (
    <div className={cn('relative', className)}>
      <span
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500 dark:text-zinc-400"
        aria-hidden="true"
      >
        {currency}
      </span>
      <Input
        id={id}
        name={name}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        aria-label={ariaLabel ?? `Amount in ${currency}`}
        value={display}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className="pl-14 text-right tabular-nums"
      />
    </div>
  )
}
