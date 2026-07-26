'use client'

import { EmptyState } from '@/components/shared/empty-state'
import { MobileRecordCard } from '@/components/shared/mobile-record-card'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Inbox } from 'lucide-react'

export interface DataTableColumn<T> {
  key: string
  header: React.ReactNode
  className?: string
  cell: (row: T) => React.ReactNode
  hideOnMobile?: boolean
}

interface ResponsiveDataTableProps<T> {
  columns: DataTableColumn<T>[]
  data: T[]
  getRowKey: (row: T) => string
  renderMobileCard: (row: T) => React.ReactNode
  emptyTitle?: string
  emptyDescription?: string
  className?: string
}

export function ResponsiveDataTable<T>({
  columns,
  data,
  getRowKey,
  renderMobileCard,
  emptyTitle = 'No records found',
  emptyDescription,
  className,
}: ResponsiveDataTableProps<T>) {
  if (data.length === 0) {
    return <EmptyState icon={Inbox} title={emptyTitle} description={emptyDescription} />
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="space-y-3 md:hidden">
        {data.map((row) => (
          <MobileRecordCard key={getRowKey(row)}>{renderMobileCard(row)}</MobileRecordCard>
        ))}
      </div>

      <Card className="hidden overflow-hidden md:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      scope="col"
                      className={cn(
                        'px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400',
                        column.className,
                      )}
                    >
                      {column.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr
                    key={getRowKey(row)}
                    className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                  >
                    {columns.map((column) => (
                      <td key={column.key} className={cn('px-4 py-3', column.className)}>
                        {column.cell(row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
