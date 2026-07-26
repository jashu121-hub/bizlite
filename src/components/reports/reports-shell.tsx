'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

import { ExecutiveSummary } from '@/components/reports/executive-summary'
import { ReportHeader } from '@/components/reports/report-header'
import { ReportTabs } from '@/components/reports/report-tabs'
import { ExpensesTab } from '@/components/reports/tabs/expenses-tab'
import { InventoryTab } from '@/components/reports/tabs/inventory-tab'
import { OverviewTab } from '@/components/reports/tabs/overview-tab'
import { ProductsTab } from '@/components/reports/tabs/products-tab'
import { ProfitabilityTab } from '@/components/reports/tabs/profitability-tab'
import { ReceivablesTab } from '@/components/reports/tabs/receivables-tab'
import { SalesTab } from '@/components/reports/tabs/sales-tab'
import { APP_NAME } from '@/lib/constants'
import { isReportTab, type ReportTabId, type ReportsData } from '@/lib/types/reports'

export function ReportsShell({
  data,
  currency,
  initialTab,
}: {
  data: ReportsData
  currency: string
  initialTab: ReportTabId
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<ReportTabId>(initialTab)

  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (isReportTab(tabParam) && tabParam !== activeTab) {
      setActiveTab(tabParam)
    }
    // Sync from URL when date-filter navigation brings a tab param
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const setTab = useCallback(
    (tab: ReportTabId) => {
      setActiveTab(tab)
      const params = new URLSearchParams(searchParams.toString())
      params.set('tab', tab)
      window.history.replaceState(null, '', `${pathname}?${params.toString()}`)
    },
    [pathname, searchParams],
  )

  return (
    <div className="space-y-4">
      <ReportHeader data={data} currency={currency} />
      <ExecutiveSummary data={data} currency={currency} onNavigateTab={setTab} />
      <ReportTabs active={activeTab} onChange={setTab} />
      <div role="tabpanel">
        {activeTab === 'overview' ? (
          <OverviewTab data={data} currency={currency} onNavigateTab={setTab} />
        ) : null}
        {activeTab === 'sales' ? <SalesTab data={data} currency={currency} /> : null}
        {activeTab === 'expenses' ? <ExpensesTab data={data} currency={currency} /> : null}
        {activeTab === 'profitability' ? (
          <ProfitabilityTab
            data={data}
            currency={currency}
            onViewAllProducts={() => setTab('products')}
          />
        ) : null}
        {activeTab === 'products' ? <ProductsTab data={data} currency={currency} /> : null}
        {activeTab === 'receivables' ? (
          <ReceivablesTab data={data} currency={currency} />
        ) : null}
        {activeTab === 'inventory' ? <InventoryTab data={data} currency={currency} /> : null}
      </div>
      <p className="pt-2 text-center text-xs text-zinc-400">Generated using {APP_NAME}</p>
    </div>
  )
}
