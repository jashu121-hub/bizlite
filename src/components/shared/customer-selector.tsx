'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export interface CustomerOption {
  id: string
  name: string
}

interface CustomerSelectorProps {
  customers: CustomerOption[]
  value: string
  onChange: (customerId: string) => void
  label?: string
  placeholder?: string
  walkInLabel?: string
  allowWalkIn?: boolean
  disabled?: boolean
  className?: string
  id?: string
}

export function CustomerSelector({
  customers,
  value,
  onChange,
  label = 'Customer',
  placeholder = 'Select a customer',
  walkInLabel = 'Walk-in customer',
  allowWalkIn = true,
  disabled,
  className,
  id = 'customer-selector',
}: CustomerSelectorProps) {
  const selectValue = value === '' && allowWalkIn ? '__walk_in__' : value

  const handleChange = (next: string) => {
    onChange(next === '__walk_in__' ? '' : next)
  }

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={id}>{label}</Label>
      <Select value={selectValue} onValueChange={handleChange} disabled={disabled}>
        <SelectTrigger id={id} aria-label={label}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {allowWalkIn ? (
            <SelectItem value="__walk_in__">{walkInLabel}</SelectItem>
          ) : null}
          {customers.map((customer) => (
            <SelectItem key={customer.id} value={customer.id}>
              {customer.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
