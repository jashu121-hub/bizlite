import { ReportsShell } from '@/components/reports/reports-shell'
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

  // Suspense around client shell only aids hydration; data is already loaded above.
  // Route-level loading.tsx covers navigation feedback.
  return <ReportsShell data={reports} currency={profile.currency} initialTab={tab} />
}
