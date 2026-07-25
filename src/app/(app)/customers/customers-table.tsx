'use client'

import Link from 'next/link'

import { CurrencyDisplay } from '@/components/shared/currency-display'
import { ResponsiveDataTable } from '@/components/shared/responsive-data-table'

export type CustomerRow = {
  id: string
  name: string
  phone: string | null
  email: string | null
  outstanding: number
}

export function CustomersTable({
  customers,
  currency,
}: {
  customers: CustomerRow[]
  currency: string
}) {
  return (
    <ResponsiveDataTable
      data={customers}
      getRowKey={(c) => c.id}
      columns={[
        {
          key: 'name',
          header: 'Customer',
          cell: (c) => (
            <Link className="font-medium hover:underline" href={`/customers/${c.id}`}>
              {c.name}
            </Link>
          ),
        },
        { key: 'phone', header: 'Phone', cell: (c) => c.phone ?? '—' },
        { key: 'email', header: 'Email', cell: (c) => c.email ?? '—' },
        {
          key: 'balance',
          header: 'Outstanding',
          cell: (c) => <CurrencyDisplay currency={currency} value={c.outstanding} />,
        },
      ]}
      renderMobileCard={(c) => (
        <div>
          <Link className="font-medium" href={`/customers/${c.id}`}>
            {c.name}
          </Link>
          <p className="text-sm text-zinc-500">{c.phone ?? 'No phone'}</p>
          <CurrencyDisplay currency={currency} value={c.outstanding} />
        </div>
      )}
      emptyTitle="No customers yet"
      emptyDescription="Add customers to track credit sales and balances."
    />
  )
}
