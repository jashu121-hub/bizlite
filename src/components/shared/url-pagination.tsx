'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { PaginationControls } from '@/components/shared/pagination-controls'

export function UrlPagination({
  page,
  pageSize,
  total,
}: {
  page: number
  pageSize: number
  total: number
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  return (
    <PaginationControls
      page={page}
      pageSize={pageSize}
      total={total}
      onPageChange={(next) => {
        const sp = new URLSearchParams(searchParams.toString())
        sp.set('page', String(next))
        router.push(`${pathname}?${sp.toString()}`)
      }}
    />
  )
}
