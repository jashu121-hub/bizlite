'use client'

import * as React from 'react'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface NumberInputProps {
  value: number | string
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  id?: string
  name?: string
  placeholder?: string
  disabled?: boolean
  required?: boolean
  allowDecimals?: boolean
  className?: string
  'aria-label'?: string
}

export function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  id,
  name,
  placeholder,
  disabled,
  required,
  allowDecimals = false,
  className,
  'aria-label': ariaLabel,
}: NumberInputProps) {
  const stringValue = value === '' || value === null || value === undefined ? '' : String(value)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    if (raw === '') {
      onChange(0)
      return
    }

    const pattern = allowDecimals ? /^-?\d*\.?\d*$/ : /^-?\d*$/
    if (!pattern.test(raw)) return

    const parsed = allowDecimals ? parseFloat(raw) : parseInt(raw, 10)
    if (Number.isNaN(parsed)) return

    let next = parsed
    if (min !== undefined) next = Math.max(min, next)
    if (max !== undefined) next = Math.min(max, next)
    onChange(next)
  }

  return (
    <Input
      id={id}
      name={name}
      type="text"
      inputMode={allowDecimals ? 'decimal' : 'numeric'}
      aria-label={ariaLabel}
      value={stringValue}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      min={min}
      max={max}
      step={step}
      className={cn('tabular-nums', className)}
    />
  )
}
