import type { LucideIcon } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type SummaryTone = 'default' | 'success' | 'warning' | 'danger' | 'info'

interface SummaryCardProps {
  label: string
  value: React.ReactNode
  hint?: string
  icon?: LucideIcon
  tone?: SummaryTone
  className?: string
}

const toneStyles: Record<SummaryTone, { card: string; icon: string }> = {
  default: {
    card: 'border-zinc-200 dark:border-zinc-800',
    icon: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  },
  success: {
    card: 'border-emerald-200 dark:border-emerald-900',
    icon: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
  },
  warning: {
    card: 'border-amber-200 dark:border-amber-900',
    icon: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  },
  danger: {
    card: 'border-red-200 dark:border-red-900',
    icon: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
  },
  info: {
    card: 'border-teal-200 dark:border-teal-900',
    icon: 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-400',
  },
}

export function SummaryCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'default',
  className,
}: SummaryCardProps) {
  const styles = toneStyles[tone]

  return (
    <Card className={cn(styles.card, className)}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
            <p className="truncate text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              {value}
            </p>
            {hint ? (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>
            ) : null}
          </div>
          {Icon ? (
            <div
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                styles.icon,
              )}
              aria-hidden="true"
            >
              <Icon className="h-5 w-5" />
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
