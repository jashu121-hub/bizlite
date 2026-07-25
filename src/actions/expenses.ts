'use server'

import { revalidatePath } from 'next/cache'
import type {
  ExpenseCostType,
  PaymentMethod,
} from '@prisma/client'
import { requireProfile } from '@/lib/auth'
import { fail, ok } from '@/lib/action-result'
import { prisma } from '@/lib/prisma'
import { prismaDecimal } from '@/lib/money'
import { toDateOnly } from '@/lib/dates'
import { expenseSchema } from '@/lib/validations/expense'

function revalidateExpensePaths() {
  revalidatePath('/expenses')
  revalidatePath('/dashboard')
  revalidatePath('/reports')
}

async function normalizeExpenseWrite(
  userId: string,
  data: {
    categoryId: string
    costType: string
    vendor?: string
    reference?: string
    notes?: string
  },
  options?: { allowArchivedCategoryId?: string | null },
) {
  const category = await prisma.expenseCategoryItem.findFirst({
    where: { id: data.categoryId, userId },
    include: { children: { select: { id: true } } },
  })
  if (!category) throw new Error('Category not found')
  if (
    category.isArchived &&
    category.id !== options?.allowArchivedCategoryId
  ) {
    throw new Error('This category is archived')
  }
  if (category.isTransport && category.children.length > 0) {
    throw new Error('Select a transport subcategory')
  }

  return {
    categoryId: category.id,
    costType: (category.parentId && category.defaultCostType
      ? category.defaultCostType
      : data.costType) as ExpenseCostType,
    vendor: data.vendor?.trim() || null,
    reference: data.reference?.trim() || null,
    notes: data.notes?.trim() || null,
  }
}

export async function createExpenseAction(raw: unknown) {
  try {
    const { user } = await requireProfile()
    const parsed = expenseSchema.safeParse(raw)
    if (!parsed.success) return fail(parsed.error.issues[0]?.message || 'Invalid expense')
    const data = parsed.data
    const classified = await normalizeExpenseWrite(user.id, data)
    const cashAccountId = data.cashAccountId || null
    if (cashAccountId) {
      const account = await prisma.cashAccount.findFirst({
        where: { id: cashAccountId, userId: user.id, isActive: true },
      })
      if (!account) return fail('Selected cash/bank account was not found')
    }

    const expense = await prisma.$transaction(async (tx) => {
      const created = await tx.expense.create({
        data: {
          userId: user.id,
          date: toDateOnly(data.date),
          categoryId: classified.categoryId,
          costType: classified.costType,
          description: data.description.trim(),
          amount: prismaDecimal(data.amount),
          paymentMethod: data.paymentMethod as PaymentMethod,
          cashAccountId,
          vendor: classified.vendor,
          reference: classified.reference,
          notes: classified.notes,
        },
      })
      if (cashAccountId) {
        await tx.cashAccount.update({
          where: { id: cashAccountId },
          data: { currentBalance: { decrement: prismaDecimal(data.amount) } },
        })
        await tx.cashTransaction.create({
          data: {
            userId: user.id,
            accountId: cashAccountId,
            type: 'EXPENSE_PAYMENT',
            date: toDateOnly(data.date),
            amount: prismaDecimal(-Number(data.amount)),
            expenseId: created.id,
            notes: data.description.trim(),
          },
        })
      }
      return created
    })
    revalidateExpensePaths()
    revalidatePath('/cash-bank')
    return ok({ id: expense.id }, 'Expense saved')
  } catch (error) {
    console.error('createExpenseAction', error)
    return fail(error instanceof Error ? error.message : 'Unable to save expense')
  }
}

export async function updateExpenseAction(id: string, raw: unknown) {
  try {
    const { user } = await requireProfile()
    const parsed = expenseSchema.safeParse(raw)
    if (!parsed.success) return fail(parsed.error.issues[0]?.message || 'Invalid expense')
    const existing = await prisma.expense.findFirst({ where: { id, userId: user.id } })
    if (!existing) return fail('Expense not found')
    const data = parsed.data
    const classified = await normalizeExpenseWrite(user.id, data, {
      allowArchivedCategoryId: existing.categoryId,
    })
    const cashAccountId = data.cashAccountId || null
    if (cashAccountId) {
      const account = await prisma.cashAccount.findFirst({
        where: { id: cashAccountId, userId: user.id, isActive: true },
      })
      if (!account) return fail('Selected cash/bank account was not found')
    }

    await prisma.$transaction(async (tx) => {
      const priorCash = await tx.cashTransaction.findMany({
        where: { userId: user.id, expenseId: id },
      })
      for (const row of priorCash) {
        await tx.cashAccount.update({
          where: { id: row.accountId },
          data: { currentBalance: { decrement: row.amount } },
        })
      }
      await tx.cashTransaction.deleteMany({ where: { userId: user.id, expenseId: id } })

      await tx.expense.update({
        where: { id },
        data: {
          date: toDateOnly(data.date),
          categoryId: classified.categoryId,
          costType: classified.costType,
          description: data.description.trim(),
          amount: prismaDecimal(data.amount),
          paymentMethod: data.paymentMethod as PaymentMethod,
          cashAccountId,
          vendor: classified.vendor,
          reference: classified.reference,
          notes: classified.notes,
        },
      })

      if (cashAccountId) {
        await tx.cashAccount.update({
          where: { id: cashAccountId },
          data: { currentBalance: { decrement: prismaDecimal(data.amount) } },
        })
        await tx.cashTransaction.create({
          data: {
            userId: user.id,
            accountId: cashAccountId,
            type: 'EXPENSE_PAYMENT',
            date: toDateOnly(data.date),
            amount: prismaDecimal(-Number(data.amount)),
            expenseId: id,
            notes: data.description.trim(),
          },
        })
      }
    })
    revalidateExpensePaths()
    revalidatePath('/cash-bank')
    return ok({ id }, 'Expense updated')
  } catch (error) {
    console.error('updateExpenseAction', error)
    return fail(error instanceof Error ? error.message : 'Unable to update expense')
  }
}

export async function deleteExpenseAction(id: string) {
  try {
    const { user } = await requireProfile()
    const existing = await prisma.expense.findFirst({ where: { id, userId: user.id } })
    if (!existing) return fail('Expense not found')
    await prisma.$transaction(async (tx) => {
      const priorCash = await tx.cashTransaction.findMany({
        where: { userId: user.id, expenseId: id },
      })
      for (const row of priorCash) {
        await tx.cashAccount.update({
          where: { id: row.accountId },
          data: { currentBalance: { decrement: row.amount } },
        })
      }
      await tx.cashTransaction.deleteMany({ where: { userId: user.id, expenseId: id } })
      await tx.expense.delete({ where: { id } })
    })
    revalidateExpensePaths()
    revalidatePath('/cash-bank')
    return ok({ id }, 'Expense deleted')
  } catch (error) {
    console.error('deleteExpenseAction', error)
    return fail('Unable to delete expense')
  }
}

/** @deprecated Use bulkUpdateExpenseCategoryDefaultsAction. */
export async function updateExpenseCostDefaultsAction(_raw: unknown) {
  return fail('Expense defaults are now managed per category')
}

