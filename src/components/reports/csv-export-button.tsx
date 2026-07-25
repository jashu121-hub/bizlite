'use client'

import { Download } from 'lucide-react'

import { Button } from '@/components/ui/button'

type CsvValue = string | number | Date | null | undefined

interface CsvExportButtonProps<T> {
  filename: string
  columns: { label: string; value: (row: T) => CsvValue }[]
  rows: T[]
}

function csvCell(value: CsvValue): string {
  const text =
    value instanceof Date ? value.toISOString().slice(0, 10) : value === null || value === undefined ? '' : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

export function CsvExportButton<T>({ filename, columns, rows }: CsvExportButtonProps<T>) {
  const downloadCsv = () => {
    const csv = [
      columns.map((column) => csvCell(column.label)).join(','),
      ...rows.map((row) => columns.map((column) => csvCell(column.value(row))).join(',')),
    ].join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={downloadCsv}>
      <Download />
      Export CSV
    </Button>
  )
}
