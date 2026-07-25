import { notFound } from 'next/navigation'
import { updateExpenseAction } from '@/actions/expenses'
import { ExpenseForm } from '../../expense-form'
import { PageHeader } from '@/components/shared/page-header'
import { requireProfile } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'

export default async function EditExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { profile, user } = await requireProfile()
  const expense = await prisma.expense.findFirst({ where: { id, userId: user.id } })
  if (!expense) notFound()
  return <div className="space-y-6"><PageHeader title="Edit expense" description="Update the expense record." /><ExpenseForm currency={profile.currency} initial={{ date: format(expense.date, 'yyyy-MM-dd'), category: expense.category, description: expense.description, amount: expense.amount.toString(), paymentMethod: expense.paymentMethod, notes: expense.notes ?? '' }} onSubmit={(data) => updateExpenseAction(id, data)} /></div>
}
