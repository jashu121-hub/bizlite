'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { deleteCustomerAction } from '@/actions/customers'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { ResponsiveDataTable } from '@/components/shared/responsive-data-table'
import { Button } from '@/components/ui/button'

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
  const router = useRouter()

  const remove = async (id: string) => {
    const result = await deleteCustomerAction(id)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    toast.success(result.message ?? 'Customer deleted')
    router.refresh()
  }

  const actions = (customer: CustomerRow) => (
    <div className="flex justify-end gap-1">
      <Button asChild variant="ghost" size="icon">
        <Link href={`/customers/${customer.id}/edit`}>
          <Pencil className="h-4 w-4" />
          <span className="sr-only">Edit</span>
        </Link>
      </Button>
      <ConfirmDialog
        title="Delete customer?"
        description="This will permanently remove the customer. Sales history may keep references."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => remove(customer.id)}
        trigger={
          <Button variant="ghost" size="icon">
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete</span>
          </Button>
        }
      />
    </div>
  )

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
        {
          key: 'actions',
          header: 'Actions',
          className: 'text-right',
          cell: (c) => actions(c),
        },
      ]}
      renderMobileCard={(c) => (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link className="font-medium" href={`/customers/${c.id}`}>
              {c.name}
            </Link>
            <p className="text-sm text-zinc-500">{c.phone ?? 'No phone'}</p>
            <CurrencyDisplay currency={currency} value={c.outstanding} />
          </div>
          {actions(c)}
        </div>
      )}
      emptyTitle="No customers yet"
      emptyDescription="Add customers to track credit sales and balances."
    />
  )
}
