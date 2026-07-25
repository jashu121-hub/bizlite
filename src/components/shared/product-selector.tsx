'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export interface ProductOption {
  id: string
  name: string
  currentStock: number
  sellingPrice: number | string
}

interface ProductSelectorProps {
  products: ProductOption[]
  value: string
  onChange: (productId: string) => void
  label?: string
  placeholder?: string
  disabled?: boolean
  className?: string
  id?: string
}

export function ProductSelector({
  products,
  value,
  onChange,
  label = 'Product',
  placeholder = 'Select a product',
  disabled,
  className,
  id = 'product-selector',
}: ProductSelectorProps) {
  const selected = products.find((p) => p.id === value)

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id={id} aria-label={label}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {products.map((product) => (
            <SelectItem key={product.id} value={product.id}>
              <span className="flex w-full items-center justify-between gap-4">
                <span>{product.name}</span>
                <span className="text-xs text-zinc-500">
                  Stock: {product.currentStock} ·{' '}
                  <CurrencyDisplay value={product.sellingPrice} />
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selected ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {selected.currentStock} in stock ·{' '}
          <CurrencyDisplay value={selected.sellingPrice} /> each
        </p>
      ) : null}
    </div>
  )
}
