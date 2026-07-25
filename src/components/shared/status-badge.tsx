import type { PaymentStatus } from '@prisma/client'

import { Badge } from '@/components/ui/badge'
import { paymentStatusLabel } from '@/lib/labels'
import { cn } from '@/lib/utils'

type StockStatus = 'In Stock' | 'Low Stock' | 'Out of Stock'

interface StatusBadgeProps {
  status: PaymentStatus | StockStatus
  className?: string
}

const paymentVariants: Record<PaymentStatus, 'success' | 'warning' | 'muted'> = {
  PAID: 'success',
  PARTIALLY_PAID: 'warning',
  PENDING: 'muted',
}

const stockVariants: Record<StockStatus, 'success' | 'warning' | 'destructive'> = {
  'In Stock': 'success',
  'Low Stock': 'warning',
  'Out of Stock': 'destructive',
}

function isPaymentStatus(status: PaymentStatus | StockStatus): status is PaymentStatus {
  return status === 'PAID' || status === 'PARTIALLY_PAID' || status === 'PENDING'
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const variant = isPaymentStatus(status) ? paymentVariants[status] : stockVariants[status]
  const label = isPaymentStatus(status) ? paymentStatusLabel(status) : status

  return (
    <Badge variant={variant} className={cn(className)}>
      {label}
    </Badge>
  )
}
