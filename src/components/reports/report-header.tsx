'use client'

import { RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

import { ExportReportMenu } from '@/components/reports/export-report-menu'
import { ReportsDateFilter } from '@/components/reports/reports-date-filter'
import { Button } from '@/components/ui/button'
import type { ReportsData } from '@/lib/types/reports'
import { cn } from '@/lib/utils'

export function ReportHeader({
  data,
  currency,
}: {
  data: ReportsData
  currency: string
}) {
  const router = useRouter()
  const [refreshing, startRefresh] = useTransition()

  return (
    <header className="sticky top-0 z-30 -mx-4 border-b border-zinc-200/80 bg-[#f3f6f5]/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-zinc-900">Reports</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Business performance for {data.range.label}
          </p>
        </div>
        <div className="flex min-w-0 flex-col gap-2 lg:items-end">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={refreshing}
              onClick={() => startRefresh(() => router.refresh())}
            >
              <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
              Refresh
            </Button>
            <ExportReportMenu data={data} currency={currency} />
          </div>
          <ReportsDateFilter
            range={{
              preset: data.range.preset,
              label: data.range.label,
              from: data.range.from,
              to: data.range.to,
              year: data.range.year,
              month: data.range.month,
            }}
          />
        </div>
      </div>
    </header>
  )
}
