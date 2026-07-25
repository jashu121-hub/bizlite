'use server'

import type { ExpenseCostType } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { requireProfile } from '@/lib/auth'
import { fail, ok } from '@/lib/action-result'
import { listExpenseCategories } from '@/lib/expense-categories'
import { prisma } from '@/lib/prisma'

function revalidate() {
  for (const path of ['/settings', '/expenses', '/reports', '/dashboard']) revalidatePath(path)
}

function validCostType(value: unknown): value is ExpenseCostType | null {
  return value === null || value === 'PRODUCTION' || value === 'SELLING' || value === 'OVERHEAD'
}

export async function listExpenseCategoriesAction() {
  try {
    const { user } = await requireProfile()
    return ok(await listExpenseCategories(user.id, { includeArchived: true }))
  } catch { return fail('Unable to load expense categories') }
}

export async function createExpenseCategoryAction(raw: { name: string; defaultCostType: ExpenseCostType | null; parentId?: string }) {
  try {
    const { user } = await requireProfile()
    const name = raw.name?.trim()
    if (!name || !validCostType(raw.defaultCostType)) return fail('Enter a valid category name and cost type')
    if (raw.parentId) {
      const parent = await prisma.expenseCategoryItem.findFirst({ where: { id: raw.parentId, userId: user.id, isTransport: true } })
      if (!parent) return fail('Transport parent not found')
    }
    const duplicate = await prisma.expenseCategoryItem.findFirst({ where: { userId: user.id, name: { equals: name, mode: 'insensitive' } } })
    if (duplicate) return fail('A category with this name already exists')
    const category = await prisma.expenseCategoryItem.create({ data: { userId: user.id, name, defaultCostType: raw.defaultCostType, parentId: raw.parentId ?? null, sortOrder: 100 } })
    revalidate()
    return ok(category, 'Category created successfully.')
  } catch { return fail('Unable to create category') }
}

export async function updateExpenseCategoryAction(raw: { id: string; name: string; defaultCostType: ExpenseCostType | null; applyCostTypeToExisting?: boolean }) {
  try {
    const { user } = await requireProfile()
    const name = raw.name?.trim()
    if (!name || !validCostType(raw.defaultCostType)) return fail('Enter a valid category name and cost type')
    const category = await prisma.expenseCategoryItem.findFirst({ where: { id: raw.id, userId: user.id } })
    if (!category) return fail('Category not found')
    const duplicate = await prisma.expenseCategoryItem.findFirst({ where: { userId: user.id, name: { equals: name, mode: 'insensitive' }, id: { not: raw.id } } })
    if (duplicate) return fail('A category with this name already exists')
    await prisma.$transaction(async (tx) => {
      await tx.expenseCategoryItem.update({ where: { id: raw.id }, data: { name, defaultCostType: raw.defaultCostType } })
      if (raw.applyCostTypeToExisting && category.defaultCostType !== raw.defaultCostType) {
        await tx.expense.updateMany({ where: { userId: user.id, categoryId: raw.id }, data: { costType: raw.defaultCostType } })
      }
    })
    revalidate()
    return ok(undefined, 'Category updated successfully.')
  } catch { return fail('Unable to update category') }
}

export async function bulkUpdateExpenseCategoryDefaultsAction(raw: { updates: { id: string; defaultCostType: ExpenseCostType | null }[]; applyToExisting?: boolean }) {
  try {
    const { user } = await requireProfile()
    if (!raw.updates?.every((update) => validCostType(update.defaultCostType))) return fail('Invalid cost type')
    await prisma.$transaction(async (tx) => {
      for (const update of raw.updates) {
        const category = await tx.expenseCategoryItem.findFirst({ where: { id: update.id, userId: user.id } })
        if (!category) throw new Error('Category not found')
        await tx.expenseCategoryItem.update({ where: { id: update.id }, data: { defaultCostType: update.defaultCostType } })
        if (raw.applyToExisting) await tx.expense.updateMany({ where: { userId: user.id, categoryId: update.id }, data: { costType: update.defaultCostType } })
      }
    })
    revalidate()
    return ok(undefined, 'Classification defaults updated.')
  } catch { return fail('Unable to save classification defaults') }
}

export async function getCategoryUsageAction({ id }: { id: string }) {
  try {
    const { user } = await requireProfile()
    const category = await prisma.expenseCategoryItem.findFirst({ where: { id, userId: user.id }, include: { _count: { select: { expenses: true } } } })
    if (!category) return fail('Category not found')
    const total = await prisma.expense.aggregate({ where: { userId: user.id, categoryId: id }, _sum: { amount: true } })
    return ok({ count: category._count.expenses, totalAmount: Number(total._sum.amount ?? 0), name: category.name })
  } catch { return fail('Unable to load category usage') }
}

export async function reassignExpensesAction({ fromCategoryId, toCategoryId }: { fromCategoryId: string; toCategoryId: string }) {
  try {
    const { user } = await requireProfile()
    if (fromCategoryId === toCategoryId) return fail('Choose a different category')
    const count = await prisma.$transaction(async (tx) => {
      const [from, to] = await Promise.all([
        tx.expenseCategoryItem.findFirst({ where: { id: fromCategoryId, userId: user.id } }),
        tx.expenseCategoryItem.findFirst({ where: { id: toCategoryId, userId: user.id, isArchived: false } }),
      ])
      if (!from || !to) throw new Error('Category not found')
      const result = await tx.expense.updateMany({ where: { userId: user.id, categoryId: fromCategoryId }, data: { categoryId: toCategoryId } })
      return result.count
    })
    revalidate()
    return ok({ count }, 'Expenses reassigned successfully.')
  } catch { return fail('Unable to reassign expenses') }
}

export async function deleteExpenseCategoryAction({ id }: { id: string }) {
  try {
    const { user } = await requireProfile()
    await prisma.$transaction(async (tx) => {
      const category = await tx.expenseCategoryItem.findFirst({ where: { id, userId: user.id }, include: { children: { include: { _count: { select: { expenses: true } } } }, _count: { select: { expenses: true } } } })
      if (!category) throw new Error('Category not found')
      if (category._count.expenses || category.children.some((child) => child._count.expenses)) throw new Error('USED')
      await tx.expenseCategoryItem.delete({ where: { id } })
    })
    revalidate()
    return ok(undefined, 'Category deleted.')
  } catch (error) {
    if (error instanceof Error && error.message === 'USED') {
      return fail('USED')
    }
    return fail('Unable to delete category')
  }
}

export async function archiveExpenseCategoryAction({ id }: { id: string }) {
  try {
    const { user } = await requireProfile()
    const category = await prisma.expenseCategoryItem.findFirst({ where: { id, userId: user.id } })
    if (!category) return fail('Category not found')
    await prisma.expenseCategoryItem.update({ where: { id }, data: { isArchived: true } })
    revalidate()
    return ok(undefined, 'Category archived.')
  } catch { return fail('Unable to archive category') }
}

export async function restoreExpenseCategoryAction({ id }: { id: string }) {
  try {
    const { user } = await requireProfile()
    const category = await prisma.expenseCategoryItem.findFirst({ where: { id, userId: user.id } })
    if (!category) return fail('Category not found')
    await prisma.expenseCategoryItem.update({ where: { id }, data: { isArchived: false } })
    revalidate()
    return ok(undefined, 'Category restored.')
  } catch { return fail('Unable to restore category') }
}
