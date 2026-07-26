'use client'

import * as React from 'react'
import { Info, TrendingDown, TrendingUp } from 'lucide-react'

import { KpiSummaryModal } from '@/components/dashboard/kpi-summary-modal'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import type { PeriodComparison } from '@/lib/dashboard-date-range'
import type { KpiSummary, KpiType } from '@/lib/types/kpi'
import { cn } from '@/lib/utils'

type KpiCardItem = {
  type: KpiType
  label: string
  value: number
  trend?: PeriodComparison | null
  danger?: boolean
  isCount?: boolean
  ok?: boolean
  badge?: string | null
  subtitle?: string | null
  tooltip?: string | null
  summary: KpiSummary
}

function Trend({ value }: { value: PeriodComparison | null | undefined }) {
  if (!value) return null
  if (value.percent === null) {
    return (
      <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-zinc-500">
        {value.label}
      </span>
    )
  }
  if (value.label === 'No change') {
    return (
      <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-zinc-500">
        No change
      </span>
    )
  }
  const up = value.percent >= 0
  const Icon = up ? TrendingUp : TrendingDown
  const colour =
    value.favourable === true
      ? 'text-emerald-600'
      : value.favourable === false
        ? 'text-red-500'
        : 'text-zinc-500'
  return (
    <span className={cn('mt-2 inline-flex items-center gap-1 text-xs font-medium', colour)}>
      <Icon className="h-3.5 w-3.5" />
      {value.label}
    </span>
  )
}

export function DashboardKpiCards({
  items,
  currency,
}: {
  items: KpiCardItem[]
  currency: string
}) {
  const [activeType, setActiveType] = React.useState<KpiType | null>(null)
  const cardRefs = React.useRef<Partial<Record<KpiType, HTMLButtonElement | null>>>({})

  const activeSummary = activeType
    ? (items.find((item) => item.type === activeType)?.summary ?? null)
    : null

  function open(type: KpiType) {
    setActiveType(type)
  }

  function handleOpenChange(openState: boolean) {
    if (!openState) {
      const previous = activeType
      setActiveType(null)
      if (previous) {
        requestAnimationFrame(() => {
          cardRefs.current[previous]?.focus()
        })
      }
    }
  }

  return (
    <>
      <section className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 snap-x snap-mandatory md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-8">
        {items.map((kpi) => (
          <button
            key={kpi.type}
            type="button"
            ref={(node) => {
              cardRefs.current[kpi.type] = node
            }}
            onClick={() => open(kpi.type)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                open(kpi.type)
              }
            }}
            aria-haspopup="dialog"
            aria-expanded={activeType === kpi.type}
            aria-label={`View summary for ${kpi.label}`}
            title={kpi.tooltip ?? undefined}
            className={cn(
              'min-w-[168px] shrink-0 snap-start rounded-2xl border border-zinc-200/80 bg-white p-4 text-left shadow-sm outline-none transition md:min-w-0',
              'cursor-pointer hover:-translate-y-0.5 hover:border-teal-300/80 hover:shadow-md',
              'focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2',
              activeType === kpi.type && 'border-teal-300 shadow-md',
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium text-zinc-500">{kpi.label}</p>
              <div className="flex shrink-0 items-center gap-1">
                {kpi.tooltip ? (
                  <span
                    className="inline-flex text-zinc-400"
                    title={kpi.tooltip}
                    aria-label={kpi.tooltip}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <Info className="h-3.5 w-3.5" />
                  </span>
                ) : null}
                {kpi.badge ? (
                  <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
                    {kpi.badge}
                  </span>
                ) : null}
              </div>
            </div>
            <p
              className={cn(
                'mt-2 text-lg font-bold tracking-tight tabular-nums sm:text-xl',
                kpi.danger ? 'text-red-600' : 'text-zinc-900',
              )}
            >
              {kpi.isCount ? (
                kpi.value
              ) : (
                <CurrencyDisplay value={kpi.value} currency={currency} />
              )}
            </p>
            {kpi.subtitle ? (
              <p className="mt-1 text-[11px] leading-snug text-zinc-500">{kpi.subtitle}</p>
            ) : null}
            {kpi.isCount && kpi.ok ? (
              <p className="mt-2 text-xs font-medium text-emerald-600">All good! 🎉</p>
            ) : (
              <Trend value={kpi.trend} />
            )}
          </button>
        ))}
      </section>

      <KpiSummaryModal
        open={activeType !== null}
        onOpenChange={handleOpenChange}
        summary={activeSummary}
        currency={currency}
      />
    </>
  )
}
