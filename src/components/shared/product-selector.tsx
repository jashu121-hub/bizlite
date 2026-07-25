'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/money'
import { cn } from '@/lib/utils'

export interface ProductOption {
  id: string
  name: string
  sku?: string | null
  currentStock: number
  sellingPrice: number | string
}

interface ProductSelectorProps {
  products: ProductOption[]
  value: string
  onChange: (productId: string) => void
  currency?: string
  label?: string
  placeholder?: string
  disabled?: boolean
  loading?: boolean
  error?: string | null
  excludeIds?: string[]
  className?: string
  id?: string
}

function productMeta(product: ProductOption, currency: string) {
  const sku = product.sku?.trim() || 'No SKU'
  const stock =
    product.currentStock <= 0 ? 'Out of stock' : `${product.currentStock} in stock`
  const price = formatCurrency(product.sellingPrice, currency)
  return `${sku} • ${stock} • ${price}`
}

export function ProductSelector({
  products,
  value,
  onChange,
  currency = 'AED',
  label = 'Product',
  placeholder = 'Select a product',
  disabled,
  loading,
  error,
  excludeIds = [],
  className,
  id = 'product-selector',
}: ProductSelectorProps) {
  const excluded = new Set(excludeIds.filter((item) => item && item !== value))
  const options = products.filter((product) => !excluded.has(product.id))

  return (
    <div className={cn('space-y-2', className)}>
      {label ? <Label htmlFor={id}>{label}</Label> : null}
      <Select
        // Radix Select must not use empty string as value
        value={value || undefined}
        onValueChange={onChange}
        disabled={disabled || loading || !!error}
      >
        <SelectTrigger id={id} aria-label={label || placeholder} className="h-auto min-h-10 py-2">
          <SelectValue
            placeholder={loading ? 'Loading products…' : error ? 'Unable to load products' : placeholder}
          />
        </SelectTrigger>
        <SelectContent
          position="popper"
          sideOffset={4}
          className="z-[200] max-h-[min(24rem,var(--radix-select-content-available-height))] w-[var(--radix-select-trigger-width)]"
        >
          {loading ? (
            <div className="px-3 py-2 text-sm text-zinc-500">Loading products…</div>
          ) : error ? (
            <div className="px-3 py-2 text-sm text-red-600">{error}</div>
          ) : options.length === 0 ? (
            <div className="space-y-1 px-3 py-2 text-sm text-zinc-500">
              <p>No active products available.</p>
              <p className="text-xs">
                Archived products stay on the Products page but cannot be sold until restored.
              </p>
            </div>
          ) : (
            options.map((product) => {
              const outOfStock = product.currentStock <= 0
              return (
                <SelectItem
                  key={product.id}
                  value={product.id}
                  disabled={outOfStock}
                  textValue={product.name}
                  className="items-start py-2"
                >
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="font-medium text-zinc-900">
                      {product.name}
                      {outOfStock ? (
                        <span className="ml-2 text-xs font-normal text-red-600">Out of stock</span>
                      ) : null}
                    </span>
                    <span className="text-xs font-normal text-zinc-500">
                      {productMeta(product, currency)}
                    </span>
                  </span>
                </SelectItem>
              )
            })
          )}
        </SelectContent>
      </Select>
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
