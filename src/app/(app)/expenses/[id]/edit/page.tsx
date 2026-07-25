import { format } from 'date-fns'
import { notFound } from 'next/navigation'

import { updateExpenseAction } from '@/actions/expenses'
import { ExpenseForm } from '../../expense-form'
import { PageHeader } from '@/components/shared/page-header'
import { requireProfile } from '@/lib/auth'
import { listExpenseCategories, type ExpenseCategoryDTO } from '@/lib/expense-categories'
import { prisma } from '@/lib/prisma'

function withCurrentCategory(
  categories: ExpenseCategoryDTO[],
  current: {
    id: string
    name: string
    defaultCostType: ExpenseCategoryDTO['defaultCostType']
    isArchived: boolean
    isTransport: boolean
    parentId: string | null
    systemKey: string | null
    sortOrder: number
  },
): ExpenseCategoryDTO[] {
  const active = categories
    .map((root) => ({
      ...root,
      children: (root.children ?? []).filter((child) => !child.isArchived || child.id === current.id),
    }))
    .filter((root) => !root.isArchived || root.id === current.id || root.id === current.parentId)

  const asDto = (item: typeof current): ExpenseCategoryDTO => ({
    ...item,
    expenseCount: 0,
    expenseAmount: 0,
    children: [],
  })

  if (!current.parentId) {
    if (active.some((item) => item.id === current.id)) return active
    return [...active, asDto(current)]
  }

  const parentIndex = active.findIndex((item) => item.id === current.parentId)
  if (parentIndex >= 0) {
    const parent = active[parentIndex]
    const hasChild = (parent.children ?? []).some((child) => child.id === current.id)
    if (hasChild) return active
    const next = [...active]
    next[parentIndex] = {
      ...parent,
      children: [...(parent.children ?? []), asDto(current)],
    }
    return next
  }

  const parent = categories.find((item) => item.id === current.parentId)
  if (!parent) return [...active, asDto(current)]
  return [
    ...active,
    {
      ...parent,
      children: [asDto(current)],
    },
  ]
}

export default async function EditExpensePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { profile, user } = await requireProfile()
  const [expense, categories] = await Promise.all([
    prisma.expense.findFirst({
      where: { id, userId: user.id },
      include: { category: true },
    }),
    listExpenseCategories(user.id, { includeArchived: true }),
  ])
  if (!expense) notFound()

  return (
    <div className="space-y-6">
      <PageHeader title="Edit expense" description="Update the expense record." />
      <ExpenseForm
        currency={profile.currency}
        categories={withCurrentCategory(categories, expense.category)}
        initial={{
          date: format(expense.date, 'yyyy-MM-dd'),
          categoryId: expense.categoryId,
          costType: expense.costType ?? undefined,
          description: expense.description,
          amount: expense.amount.toString(),
          paymentMethod: expense.paymentMethod,
          vendor: expense.vendor ?? '',
          reference: expense.reference ?? '',
          notes: expense.notes ?? '',
        }}
        onSubmit={updateExpenseAction.bind(null, id)}
      />
    </div>
  )
}
