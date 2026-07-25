import { createExpenseAction } from '@/actions/expenses'
import { ExpenseForm } from '../expense-form'
import { PageHeader } from '@/components/shared/page-header'
import { requireProfile } from '@/lib/auth'
import { listExpenseCategories } from '@/lib/expense-categories'
import { prisma } from '@/lib/prisma'

export default async function NewExpensePage() {
  const { profile, user } = await requireProfile()
  const [categories, cashAccounts] = await Promise.all([
    listExpenseCategories(user.id, { activeOnlyForForms: true }),
    prisma.cashAccount.findMany({
      where: { userId: user.id, isActive: true },
      select: { id: true, name: true, type: true },
      orderBy: { name: 'asc' },
    }),
  ])
  return (
    <div className="space-y-6">
      <PageHeader title="New expense" description="Record a business expense." />
      <ExpenseForm
        currency={profile.currency}
        categories={categories}
        cashAccounts={cashAccounts}
        onSubmit={createExpenseAction}
      />
    </div>
  )
}
