'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { deleteCustomerAction } from '@/actions/customers'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Button } from '@/components/ui/button'

export function ConfirmDeleteCustomer({ id }: { id: string }) {
  const router = useRouter()

  return (
    <ConfirmDialog
      title="Delete customer?"
      description="This will permanently remove the customer. Sales history may keep references."
      confirmLabel="Delete"
      variant="destructive"
      onConfirm={async () => {
        const result = await deleteCustomerAction(id)
        if (!result.success) {
          toast.error(result.error)
          return
        }
        toast.success(result.message ?? 'Customer deleted')
        router.push('/customers')
        router.refresh()
      }}
      trigger={<Button variant="destructive">Delete</Button>}
    />
  )
}
