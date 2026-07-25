export type ReportTabId =
  | 'overview'
  | 'sales'
  | 'expenses'
  | 'profitability'
  | 'products'
  | 'receivables'
  | 'inventory'

export const REPORT_TABS: { id: ReportTabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'sales', label: 'Sales' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'profitability', label: 'Profitability' },
  { id: 'products', label: 'Products' },
  { id: 'receivables', label: 'Receivables' },
  { id: 'inventory', label: 'Inventory' },
]

export function isReportTab(value: string | undefined | null): value is ReportTabId {
  return REPORT_TABS.some((tab) => tab.id === value)
}

export type ReportsData = Awaited<ReturnType<typeof import('@/lib/queries/reports').getReportsData>>
