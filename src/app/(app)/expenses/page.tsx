import Link from 'next/link'
import { Plus } from 'lucide-react'
import type { ExpenseCostType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireProfile } from '@/lib/auth'
import { PAGE_SIZE } from '@/lib/constants'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { ExpenseList } from './expense-list'
import { type DateFilterPreset } from '@/lib/dates'
import {
  getDashboardDateRange,
  toDashboardDateRangeCompat,
} from '@/lib/dashboard-date-range'
import { prismaDateFilter } from '@/lib/dates'
import { listExpenseCategories } from '@/lib/expense-categories'

const COST_TYPES = new Set<ExpenseCostType>(['PRODUCTION', 'SELLING', 'OVERHEAD'])

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const { user, profile } = await requireProfile()
  const value = (key: string) => (typeof params[key] === 'string' ? params[key] : undefined)
  const q = value('q')?.trim() ?? ''
  const category = value('category')
  const page = Math.max(1, Number(value('page')) || 1)
  const preset = (value('preset') as DateFilterPreset) || undefined
  const costTypeParam = value('costType')
  const costType =
    costTypeParam && COST_TYPES.has(costTypeParam as ExpenseCostType)
      ? (costTypeParam as ExpenseCostType)
      : undefined
  const needsClassification = value('needsClassification') === '1'

  const dashboardRange = preset
    ? getDashboardDateRange({
        preset,
        from: value('from'),
        to: value('to'),
        year: value('year'),
        month: value('month'),
      })
    : null
  const dateFilter = dashboardRange
    ? prismaDateFilter(toDashboardDateRangeCompat(dashboardRange))
    : undefined

  const where = {
    userId: user.id,
    ...(q ? { description: { contains: q, mode: 'insensitive' as const } } : {}),
    ...(category ? { categoryId: category } : {}),
    ...(dateFilter ? { date: dateFilter } : {}),
    ...(needsClassification
      ? { costType: null }
      : costType
        ? { costType }
        : {}),
  }

  const [expenses, total, categories] = await Promise.all([
    prisma.expense.findMany({
      where,
      orderBy: { date: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { category: { select: { id: true, name: true } } },
    }),
    prisma.expense.count({ where }),
    listExpenseCategories(user.id, { activeOnlyForForms: true }),
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        description="Record operating costs that do not create inventory. Stock purchases and production costs should not normally be entered as operating expenses — they are recorded as inventory and recognised as COGS when sold."
        actions={
          <Button asChild>
            <Link href="/expenses/new">
              <Plus /> New expense
            </Link>
          </Button>
        }
      />
      <ExpenseList expenses={expenses} categories={categories} total={total} page={page} currency={profile.currency} />
    </div>
  )
}
