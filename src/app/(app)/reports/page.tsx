import { Suspense } from 'react'

import { ReportsShell } from '@/components/reports/reports-shell'
import { Skeleton } from '@/components/ui/skeleton'
import { requireProfile } from '@/lib/auth'
import type { DateFilterPreset } from '@/lib/dates'
import { getReportsData } from '@/lib/queries/reports'
import { isReportTab, type ReportTabId } from '@/lib/types/reports'

const validPresets: DateFilterPreset[] = ['month', 'ytd', 'year', 'lifetime', 'custom']

function isPreset(value: string | undefined): value is DateFilterPreset {
  return Boolean(value && validPresets.includes(value as DateFilterPreset))
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    range?: string
    from?: string
    to?: string
    year?: string
    month?: string
    tab?: string
  }>
}) {
  const params = await searchParams
  const preset = isPreset(params.range) ? params.range : 'month'
  const tab: ReportTabId = isReportTab(params.tab) ? params.tab : 'overview'
  const { user, profile } = await requireProfile()
  const reports = await getReportsData(user.id, {
    preset,
    from: params.from,
    to: params.to,
    year: params.year,
    month: params.month,
  })

  return (
    <Suspense fallback={<ReportsLoadingSkeleton />}>
      <ReportsShell data={reports} currency={profile.currency} initialTab={tab} />
    </Suspense>
  )
}

function ReportsLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24 w-full" />
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}
