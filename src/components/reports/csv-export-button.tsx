'use client'

import { Download } from 'lucide-react'

import { Button } from '@/components/ui/button'

type CsvValue = string | number | null | undefined

interface CsvExportButtonProps {
  filename: string
  headers: string[]
  rows: CsvValue[][]
}

function csvCell(value: CsvValue): string {
  const text = value === null || value === undefined ? '' : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

export function CsvExportButton({ filename, headers, rows }: CsvExportButtonProps) {
  const downloadCsv = () => {
    const csv = [
      headers.map((header) => csvCell(header)).join(','),
      ...rows.map((row) => row.map((cell) => csvCell(cell)).join(',')),
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
