import Link from 'next/link'
import { Plus } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requireProfile } from '@/lib/auth'
import { PAGE_SIZE } from '@/lib/constants'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { ExpenseList } from './expense-list'
import { getDateRange, prismaDateFilter, type DateFilterPreset } from '@/lib/dates'

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
  const range = preset ? getDateRange(preset, value('from'), value('to')) : null
  const dateFilter = range ? prismaDateFilter(range) : undefined

  const where = {
    userId: user.id,
    ...(q ? { description: { contains: q, mode: 'insensitive' as const } } : {}),
    ...(category ? { category: category as never } : {}),
    ...(dateFilter ? { date: dateFilter } : {}),
  }

  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      orderBy: { date: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.expense.count({ where }),
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        description="Track your business spending."
        actions={
          <Button asChild>
            <Link href="/expenses/new">
              <Plus /> New expense
            </Link>
          </Button>
        }
      />
      <ExpenseList expenses={expenses} total={total} page={page} currency={profile.currency} />
    </div>
  )
}
