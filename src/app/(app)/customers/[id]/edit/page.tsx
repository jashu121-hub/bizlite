import { notFound } from 'next/navigation'
import { requireProfile } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/shared/page-header'
import { updateCustomerAction } from '@/actions/customers'
import { CustomerForm } from '../../customer-form'

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { user } = await requireProfile()
  const customer = await prisma.customer.findFirst({ where: { id, userId: user.id } })
  if (!customer) notFound()

  async function submit(data: Parameters<typeof updateCustomerAction>[1]) {
    'use server'
    return updateCustomerAction(id, data)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Edit customer" description="Update customer contact details." />
      <CustomerForm
        initial={{
          name: customer.name,
          phone: customer.phone ?? '',
          email: customer.email ?? '',
          address: customer.address ?? '',
          notes: customer.notes ?? '',
        }}
        onSubmit={submit}
      />
    </div>
  )
}
