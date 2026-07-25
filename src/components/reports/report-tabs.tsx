'use client'

import { cn } from '@/lib/utils'
import { REPORT_TABS, type ReportTabId } from '@/lib/types/reports'

export function ReportTabs({
  active,
  onChange,
}: {
  active: ReportTabId
  onChange: (tab: ReportTabId) => void
}) {
  return (
    <div className="-mx-1 overflow-x-auto pb-1">
      <div
        role="tablist"
        aria-label="Report sections"
        className="flex min-w-max gap-1 px-1"
      >
        {REPORT_TABS.map((tab) => {
          const selected = tab.id === active
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onChange(tab.id)}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-sm font-medium transition',
                selected
                  ? 'bg-teal-700 text-white shadow-sm'
                  : 'bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50',
              )}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
