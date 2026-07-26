'use client'

import Link from 'next/link'
import { ArrowRight, X } from 'lucide-react'

import { CurrencyDisplay } from '@/components/shared/currency-display'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import type { KpiSummary } from '@/lib/types/kpi'
import { cn } from '@/lib/utils'

const toneClass = {
  default: 'text-zinc-900',
  success: 'text-emerald-600',
  danger: 'text-red-600',
  warning: 'text-amber-600',
} as const

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  summary: KpiSummary | null
  currency: string
  loading?: boolean
}

export function KpiSummaryModal({ open, onOpenChange, summary, currency, loading }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          'gap-0 overflow-hidden border-zinc-200/80 bg-white p-0 shadow-xl',
          // Mobile bottom sheet
          'top-auto bottom-0 left-0 right-0 max-h-[85vh] w-full max-w-none translate-x-0 translate-y-0 rounded-t-2xl rounded-b-none',
          'data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom',
          // Desktop / tablet centred modal
          'sm:top-[50%] sm:bottom-auto sm:left-[50%] sm:right-auto sm:max-h-[70vh] sm:w-full sm:max-w-[460px] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-2xl',
          'sm:data-[state=open]:slide-in-from-left-1/2 sm:data-[state=open]:slide-in-from-top-[48%] sm:data-[state=closed]:slide-out-to-left-1/2 sm:data-[state=closed]:slide-out-to-top-[48%]',
        )}
      >
        {loading || !summary ? (
          <div className="space-y-4 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-5">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-9 w-36" />
            <div className="space-y-2 pt-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        ) : (
          <>
            <div className="relative border-b border-zinc-100 px-5 pb-4 pt-5">
              <DialogClose
                className="absolute right-3 top-3 rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-teal-600"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </DialogClose>
              <DialogTitle className="pr-8 text-base font-semibold text-zinc-900">
                {summary.title}
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs text-zinc-500">
                {summary.rangeLabel}
              </DialogDescription>
              <p
                className={cn(
                  'mt-3 text-2xl font-bold tracking-tight tabular-nums',
                  toneClass[summary.primaryTone ?? 'default'],
                )}
              >
                {summary.primaryIsCount ? (
                  summary.primaryValue
                ) : (
                  <CurrencyDisplay value={summary.primaryValue} currency={currency} />
                )}
              </p>
            </div>

            <div className="max-h-[min(50vh,420px)] overflow-x-hidden overflow-y-auto px-5 py-4">
              {summary.rows.length === 0 &&
              (!summary.listItems || summary.listItems.length === 0) &&
              (!summary.categories || summary.categories.length === 0) ? (
                <p className="py-8 text-center text-sm text-zinc-400">{summary.emptyMessage}</p>
              ) : (
                <div className="space-y-4">
                  <dl className="space-y-2.5">
                    {summary.rows.map((row) => (
                      <div
                        key={`${row.label}-${row.kind}`}
                        className="flex items-start justify-between gap-3 text-sm"
                      >
                        <dt className="text-zinc-500">{row.label}</dt>
                        <dd
                          className={cn(
                            'max-w-[60%] text-right font-medium tabular-nums',
                            toneClass[row.tone ?? 'default'],
                          )}
                        >
                          {row.kind === 'money' ? (
                            <CurrencyDisplay value={row.value} currency={currency} />
                          ) : row.kind === 'count' ? (
                            row.value
                          ) : (
                            row.value
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>

                  {summary.categories && summary.categories.length > 0 ? (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                        Top categories
                      </p>
                      <ul className="space-y-2">
                        {summary.categories.map((cat) => (
                          <li
                            key={cat.name}
                            className="flex items-center justify-between gap-3 rounded-xl bg-zinc-50 px-3 py-2 text-sm"
                          >
                            <span className="min-w-0 truncate font-medium text-zinc-800">
                              {cat.name}
                              <span className="ml-1.5 text-xs font-normal text-zinc-400">
                                {cat.percent.toFixed(2)}%
                              </span>
                            </span>
                            <CurrencyDisplay
                              value={cat.amount}
                              currency={currency}
                              className="shrink-0 font-semibold"
                            />
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {summary.listItems && summary.listItems.length > 0 ? (
                    <div>
                      {summary.listTitle ? (
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                          {summary.listTitle}
                        </p>
                      ) : null}
                      <ul className="space-y-2">
                        {summary.listItems.map((item) => (
                          <li
                            key={item.id}
                            className={cn(
                              'flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm',
                              item.tone === 'danger'
                                ? 'bg-red-50/80'
                                : item.tone === 'warning'
                                  ? 'bg-amber-50/80'
                                  : 'bg-zinc-50',
                            )}
                          >
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-zinc-800">{item.primary}</p>
                              {item.secondary ? (
                                <p className="truncate text-xs text-zinc-500">{item.secondary}</p>
                              ) : null}
                            </div>
                            <div className="shrink-0 text-right">
                              {item.amount !== undefined ? (
                                <CurrencyDisplay
                                  value={item.amount}
                                  currency={currency}
                                  className={cn(
                                    'text-sm font-semibold',
                                    toneClass[item.tone ?? 'default'],
                                  )}
                                />
                              ) : null}
                              {item.count !== undefined ? (
                                <p
                                  className={cn(
                                    'text-sm font-bold tabular-nums',
                                    toneClass[item.tone ?? 'default'],
                                  )}
                                >
                                  {item.count}
                                </p>
                              ) : null}
                              {item.meta ? (
                                <p className="text-[11px] text-zinc-400">{item.meta}</p>
                              ) : null}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : summary.listTitle &&
                    (!summary.listItems || summary.listItems.length === 0) &&
                    summary.primaryValue === 0 ? (
                    <p className="py-4 text-center text-sm text-zinc-400">{summary.emptyMessage}</p>
                  ) : null}
                </div>
              )}
            </div>

            <div className="border-t border-zinc-100 px-5 pb-[calc(1.25rem+4.5rem+env(safe-area-inset-bottom))] pt-3 sm:pb-5">
              <Button asChild className="w-full bg-[#0f766e] hover:bg-[#0d6a63]">
                <Link href={summary.detailsHref} onClick={() => onOpenChange(false)}>
                  {summary.detailsLabel ?? 'View Full Details'}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
