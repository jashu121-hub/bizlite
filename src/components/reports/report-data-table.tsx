'use client'

import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 12

export function ReportDataTable({
  headers,
  rows,
  emptyMessage = 'No data for this period.',
  className,
}: {
  headers: { key: string; label: string; align?: 'left' | 'right' }[]
  rows: { key: string; cells: React.ReactNode[] }[]
  emptyMessage?: string
  className?: string
}) {
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const pageRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return rows.slice(start, start + PAGE_SIZE)
  }, [page, rows])

  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-zinc-500">{emptyMessage}</p>
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="overflow-x-auto rounded-xl border border-zinc-200">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="sticky top-0 z-10 bg-zinc-50">
            <tr className="border-b border-zinc-200 text-xs text-zinc-500">
              {headers.map((header) => (
                <th
                  key={header.key}
                  className={cn(
                    'px-3 py-2 font-medium',
                    header.align === 'right' ? 'text-right' : 'text-left',
                  )}
                >
                  {header.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => (
              <tr
                key={row.key}
                className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50/80"
              >
                {row.cells.map((cell, index) => (
                  <td
                    key={`${row.key}-${index}`}
                    className={cn(
                      'px-3 py-2 align-middle',
                      headers[index]?.align === 'right' && 'text-right tabular-nums',
                    )}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 ? (
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>
            Page {page} of {totalPages} · {rows.length} rows
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
