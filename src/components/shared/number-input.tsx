'use client'

import * as React from 'react'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface NumberInputProps {
  /** String while editing; empty string means visually empty. */
  value: number | string | null | undefined
  onChange: (value: string) => void
  min?: number
  max?: number
  id?: string
  name?: string
  placeholder?: string
  disabled?: boolean
  required?: boolean
  /** Whole numbers only (quantities). Default true. */
  integer?: boolean
  allowNegative?: boolean
  className?: string
  'aria-label'?: string
}

function toDisplay(value: number | string | null | undefined): string {
  if (value === '' || value === null || value === undefined) return ''
  return String(value)
}

function sanitizeNumberInput(
  raw: string,
  { integer, allowNegative }: { integer: boolean; allowNegative: boolean },
): string | null {
  let next = raw
  if (!allowNegative) {
    next = next.replace(/-/g, '')
  } else {
    // Keep a single leading minus only
    const neg = next.startsWith('-')
    next = next.replace(/-/g, '')
    if (neg) next = `-${next}`
  }

  if (integer) {
    next = next.replace(/[^\d-]/g, '').replace(/(?!^)-/g, '')
    if (!/^-?\d*$/.test(next)) return null
    return next
  }

  next = next.replace(/[^\d.-]/g, '')
  const neg = next.startsWith('-')
  next = next.replace(/-/g, '')
  const parts = next.split('.')
  if (parts.length > 1) {
    next = `${parts[0]}.${parts.slice(1).join('')}`
  }
  if (neg && allowNegative) next = `-${next}`
  if (!/^-?\d*\.?\d*$/.test(next)) return null
  return next
}

export function NumberInput({
  value,
  onChange,
  min,
  max,
  id,
  name,
  placeholder = '0',
  disabled,
  required,
  integer = true,
  allowNegative = false,
  className,
  'aria-label': ariaLabel,
}: NumberInputProps) {
  const [display, setDisplay] = React.useState(() => toDisplay(value))
  const isFocused = React.useRef(false)

  React.useEffect(() => {
    if (isFocused.current) return
    setDisplay(toDisplay(value))
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = sanitizeNumberInput(e.target.value, { integer, allowNegative })
    if (next === null) return
    setDisplay(next)
    onChange(next)
  }

  const handleBlur = () => {
    isFocused.current = false
    if (display.trim() === '' || display === '-') {
      setDisplay('')
      onChange('')
      return
    }

    let parsed = integer ? Number.parseInt(display, 10) : Number.parseFloat(display)
    if (Number.isNaN(parsed)) {
      setDisplay('')
      onChange('')
      return
    }
    if (min !== undefined) parsed = Math.max(min, parsed)
    if (max !== undefined) parsed = Math.min(max, parsed)
    const normalized = integer ? String(Math.trunc(parsed)) : String(parsed)
    setDisplay(normalized)
    onChange(normalized)
  }

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    isFocused.current = true
    setDisplay(toDisplay(value))
    requestAnimationFrame(() => {
      e.target.select()
    })
  }

  return (
    <Input
      id={id}
      name={name}
      type="text"
      inputMode={integer ? 'numeric' : 'decimal'}
      autoComplete="off"
      aria-label={ariaLabel}
      value={display}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      className={cn('tabular-nums', className)}
    />
  )
}
