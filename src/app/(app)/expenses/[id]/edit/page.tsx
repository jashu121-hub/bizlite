import { format } from 'date-fns'
import { notFound } from 'next/navigation'

import { updateExpenseAction } from '@/actions/expenses'
import { ExpenseForm } from '../../expense-form'
import { PageHeader } from '@/components/shared/page-header'
import { requireProfile } from '@/lib/auth'
import { parseExpenseCostDefaults } from '@/lib/expense-cost'
import { prisma } from '@/lib/prisma'

export default async function EditExpensePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { profile, user } = await requireProfile()
  const expense = await prisma.expense.findFirst({ where: { id, userId: user.id } })
  if (!expense) notFound()

  return (
    <div className="space-y-6">
      <PageHeader title="Edit expense" description="Update the expense record." />
      <ExpenseForm
        currency={profile.currency}
        costDefaults={parseExpenseCostDefaults(profile.expenseCostDefaults)}
        initial={{
          date: format(expense.date, 'yyyy-MM-dd'),
          category: expense.category,
          costType: expense.costType ?? undefined,
          subcategory: expense.subcategory,
          description: expense.description,
          amount: expense.amount.toString(),
          paymentMethod: expense.paymentMethod,
          vendor: expense.vendor ?? '',
          reference: expense.reference ?? '',
          notes: expense.notes ?? '',
        }}
        onSubmit={(data) => updateExpenseAction(id, data)}
      />
    </div>
  )
}
