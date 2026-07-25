import type { ExpenseCostType, Prisma, PrismaClient } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export type ExpenseCategoryDTO = {
  id: string
  name: string
  defaultCostType: ExpenseCostType | null
  isArchived: boolean
  isTransport: boolean
  parentId: string | null
  systemKey: string | null
  sortOrder: number
  expenseCount: number
  expenseAmount: number
  children?: ExpenseCategoryDTO[]
}

export const DEFAULT_SYSTEM_CATEGORIES = [
  { systemKey: 'MATERIALS', name: 'Materials', defaultCostType: 'PRODUCTION', sortOrder: 10 },
  { systemKey: 'PACKAGING', name: 'Packaging', defaultCostType: 'PRODUCTION', sortOrder: 20 },
  { systemKey: 'TRANSPORT', name: 'Transport', defaultCostType: null, sortOrder: 30, isTransport: true },
  { systemKey: 'INWARD_TRANSPORT', name: 'Inward Transport', defaultCostType: 'PRODUCTION', sortOrder: 31, parentSystemKey: 'TRANSPORT' },
  { systemKey: 'CUSTOMER_DELIVERY', name: 'Customer Delivery', defaultCostType: 'SELLING', sortOrder: 32, parentSystemKey: 'TRANSPORT' },
  { systemKey: 'GENERAL_TRANSPORT', name: 'General Business Transport', defaultCostType: 'OVERHEAD', sortOrder: 33, parentSystemKey: 'TRANSPORT' },
  { systemKey: 'MARKETING', name: 'Marketing', defaultCostType: 'SELLING', sortOrder: 40 },
  { systemKey: 'SALARY', name: 'Salary', defaultCostType: 'OVERHEAD', sortOrder: 50 },
  { systemKey: 'UTILITIES', name: 'Utilities', defaultCostType: 'OVERHEAD', sortOrder: 60 },
  { systemKey: 'RENT', name: 'Rent', defaultCostType: 'OVERHEAD', sortOrder: 70 },
  { systemKey: 'MAINTENANCE', name: 'Maintenance', defaultCostType: 'OVERHEAD', sortOrder: 80 },
  { systemKey: 'OTHER', name: 'Other', defaultCostType: 'OVERHEAD', sortOrder: 90 },
] as const

type Db = PrismaClient | Prisma.TransactionClient

export async function ensureExpenseCategories(userId: string, tx: Db = prisma) {
  const existing = await tx.expenseCategoryItem.findMany({
    where: { userId, systemKey: { not: null } },
    select: { id: true, systemKey: true },
  })
  const byKey = new Map(existing.map((category) => [category.systemKey!, category.id]))
  // Fast path: system categories already seeded for this user
  if (DEFAULT_SYSTEM_CATEGORIES.every((item) => byKey.has(item.systemKey))) return

  for (const item of DEFAULT_SYSTEM_CATEGORIES) {
    if (byKey.has(item.systemKey)) continue
    const parentId = 'parentSystemKey' in item ? byKey.get(item.parentSystemKey) : undefined
    const created = await tx.expenseCategoryItem.upsert({
      where: { userId_name: { userId, name: item.name } },
      update: { systemKey: item.systemKey },
      create: {
        userId, name: item.name, systemKey: item.systemKey, sortOrder: item.sortOrder,
        defaultCostType: item.defaultCostType, isTransport: 'isTransport' in item && !!item.isTransport,
        parentId,
      },
      select: { id: true },
    })
    byKey.set(item.systemKey, created.id)
  }
}

export async function listExpenseCategories(
  userId: string,
  options: { includeArchived?: boolean; activeOnlyForForms?: boolean } = {},
): Promise<ExpenseCategoryDTO[]> {
  await ensureExpenseCategories(userId)
  const categories = await prisma.expenseCategoryItem.findMany({
    where: { userId, ...(options.includeArchived ? {} : { isArchived: false }) },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  })
  const grouped = await prisma.expense.groupBy({
    by: ['categoryId'],
    where: { userId },
    _count: { _all: true },
    _sum: { amount: true },
  })
  const usage = new Map(grouped.map((row) => [row.categoryId, { count: row._count._all, amount: Number(row._sum.amount ?? 0) }]))
  const asDto = (category: typeof categories[number]): ExpenseCategoryDTO => ({
    ...category,
    expenseCount: usage.get(category.id)?.count ?? 0,
    expenseAmount: usage.get(category.id)?.amount ?? 0,
  })
  const roots = categories.filter((category) => !category.parentId).map(asDto)
  return roots.map((root) => ({
    ...root,
    children: categories.filter((category) => category.parentId === root.id).map(asDto),
  }))
}

export const costTypeSelectOptions = [
  { value: '', label: 'Requires Classification' },
  { value: 'PRODUCTION', label: 'Production Cost' },
  { value: 'SELLING', label: 'Selling Cost' },
  { value: 'OVERHEAD', label: 'Overhead Cost' },
] as const

export function expenseNeedsClassification(costType: ExpenseCostType | null | undefined) {
  return !costType
}

export function costTypeLabel(costType: ExpenseCostType | null | undefined) {
  if (!costType) return 'Requires Classification'
  return costTypeSelectOptions.find((option) => option.value === costType)?.label ?? costType
}
