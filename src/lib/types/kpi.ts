export type KpiType =
  | 'todaySales'
  | 'monthSales'
  | 'totalCost'
  | 'netProfit'
  | 'pendingPayments'
  | 'stockValue'
  | 'lowStock'

export type KpiRow =
  | { kind: 'text'; label: string; value: string; tone?: 'default' | 'success' | 'danger' | 'warning' }
  | { kind: 'money'; label: string; value: number; tone?: 'default' | 'success' | 'danger' | 'warning' }
  | { kind: 'count'; label: string; value: number; tone?: 'default' | 'success' | 'danger' | 'warning' }

export type KpiListItem = {
  id: string
  primary: string
  secondary?: string
  amount?: number
  count?: number
  tone?: 'default' | 'success' | 'danger' | 'warning'
  meta?: string
}

export type KpiCategoryShare = {
  name: string
  amount: number
  percent: number
}

export type KpiExpandableSection = {
  id: string
  title: string
  defaultOpen?: boolean
  categories?: KpiCategoryShare[]
  listItems?: KpiListItem[]
}

export type KpiSummary = {
  type: KpiType
  title: string
  rangeLabel: string
  primaryValue: number
  primaryIsCount?: boolean
  primaryTone?: 'default' | 'success' | 'danger' | 'warning'
  rows: KpiRow[]
  categories?: KpiCategoryShare[]
  categoriesTitle?: string
  sections?: KpiExpandableSection[]
  listTitle?: string
  listItems?: KpiListItem[]
  emptyMessage: string
  detailsHref: string
  detailsLabel?: string
}
