import { formatCurrency, type MoneyInput } from '@/lib/money'
import { DEFAULT_CURRENCY } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface CurrencyDisplayProps {
  value: MoneyInput
  currency?: string
  className?: string
}

export function CurrencyDisplay({
  value,
  currency = DEFAULT_CURRENCY,
  className,
}: CurrencyDisplayProps) {
  return (
    <span className={cn('tabular-nums', className)}>{formatCurrency(value, currency)}</span>
  )
}
