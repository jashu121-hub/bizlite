import { createExpenseAction } from '@/actions/expenses'
import { ExpenseForm } from '../expense-form'
import { PageHeader } from '@/components/shared/page-header'
import { requireProfile } from '@/lib/auth'

export default async function NewExpensePage() {
  const { profile } = await requireProfile()
  return <div className="space-y-6"><PageHeader title="New expense" description="Record a business expense." /><ExpenseForm currency={profile.currency} onSubmit={createExpenseAction} /></div>
}
