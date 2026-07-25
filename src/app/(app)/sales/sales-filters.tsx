'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import { SearchInput } from '@/components/shared/search-input'
import { DateRangeFilter } from '@/components/shared/date-range-filter'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getDateRange, type DateFilterPreset } from '@/lib/dates'

export function SalesFilters({
  customers,
}: {
  customers: { id: string; name: string }[]
}) {
  const router = useRouter()
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()

  const preset = (params.get('preset') as DateFilterPreset) || 'month'
  const range = getDateRange(preset, params.get('from'), params.get('to'))

  function update(next: Record<string, string | null>) {
    const sp = new URLSearchParams(params.toString())
    Object.entries(next).forEach(([key, value]) => {
      if (!value) sp.delete(key)
      else sp.set(key, value)
    })
    sp.delete('page')
    startTransition(() => {
      router.push(`/sales?${sp.toString()}`)
    })
  }

  return (
    <div className={`space-y-3 ${pending ? 'opacity-70' : ''}`}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SearchInput
          value={params.get('q') || ''}
          onChange={(q) => update({ q: q || null })}
          placeholder="Search invoice or customer..."
        />
        <Select
          value={params.get('status') || 'all'}
          onValueChange={(v) => update({ status: v === 'all' ? null : v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Payment status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
            <SelectItem value="PARTIALLY_PAID">Partially Paid</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={params.get('customerId') || 'all'}
          onValueChange={(v) => update({ customerId: v === 'all' ? null : v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Customer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All customers</SelectItem>
            {customers.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/sales')}
        >
          Clear filters
        </Button>
      </div>
      <DateRangeFilter
        value={range}
        onChange={(r) =>
          update({
            preset: r.preset,
            from: r.preset === 'custom' && r.from ? r.from.toISOString().slice(0, 10) : null,
            to: r.preset === 'custom' && r.to ? r.to.toISOString().slice(0, 10) : null,
          })
        }
      />
    </div>
  )
}
