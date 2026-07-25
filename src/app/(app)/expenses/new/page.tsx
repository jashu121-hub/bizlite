import { createExpenseAction } from '@/actions/expenses'
import { ExpenseForm } from '../expense-form'
import { PageHeader } from '@/components/shared/page-header'
import { requireProfile } from '@/lib/auth'
import { listExpenseCategories } from '@/lib/expense-categories'

export default async function NewExpensePage() {
  const { profile, user } = await requireProfile()
  const categories = await listExpenseCategories(user.id, { activeOnlyForForms: true })
  return (
    <div className="space-y-6">
      <PageHeader title="New expense" description="Record a business expense." />
      <ExpenseForm
        currency={profile.currency}
        categories={categories}
        onSubmit={createExpenseAction}
      />
    </div>
  )
}
