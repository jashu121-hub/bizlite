'use client'

import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

type Tone = 'default' | 'success' | 'danger' | 'warning' | 'info'

const toneIcon: Record<Tone, string> = {
  default: 'bg-zinc-100 text-zinc-600',
  success: 'bg-emerald-50 text-emerald-700',
  danger: 'bg-red-50 text-red-600',
  warning: 'bg-amber-50 text-amber-700',
  info: 'bg-teal-50 text-teal-700',
}

const toneValue: Record<Tone, string> = {
  default: 'text-zinc-900',
  success: 'text-emerald-700',
  danger: 'text-red-600',
  warning: 'text-amber-700',
  info: 'text-teal-800',
}

export function CompactMetricCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'default',
  onClick,
  active,
  className,
}: {
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  icon?: LucideIcon
  tone?: Tone
  onClick?: () => void
  active?: boolean
  className?: string
}) {
  const Comp = onClick ? 'button' : 'div'

  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'rounded-xl border border-zinc-200/80 bg-white p-3 text-left shadow-sm transition',
        onClick && 'cursor-pointer hover:border-teal-300/70 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600',
        active && 'border-teal-300 ring-1 ring-teal-200',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-zinc-500">{label}</p>
          <p className={cn('mt-1 truncate text-base font-semibold tabular-nums sm:text-lg', toneValue[tone])}>
            {value}
          </p>
          {hint ? <p className="mt-0.5 text-[11px] text-zinc-500">{hint}</p> : null}
        </div>
        {Icon ? (
          <div
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
              toneIcon[tone],
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
      </div>
    </Comp>
  )
}
