'use server'

import { revalidatePath } from 'next/cache'
import type {
  ExpenseCategory,
  ExpenseCostType,
  ExpenseSubcategory,
  PaymentMethod,
  Prisma,
} from '@prisma/client'
import { requireProfile } from '@/lib/auth'
import { fail, ok } from '@/lib/action-result'
import { prisma } from '@/lib/prisma'
import { prismaDecimal } from '@/lib/money'
import { toDateOnly } from '@/lib/dates'
import {
  costTypeFromTransportSubcategory,
  parseExpenseCostDefaults,
} from '@/lib/expense-cost'
import { expenseSchema } from '@/lib/validations/expense'

function revalidateExpensePaths() {
  revalidatePath('/expenses')
  revalidatePath('/dashboard')
  revalidatePath('/reports')
}

function normalizeExpenseWrite(data: {
  category: string
  costType: string
  subcategory?: string | null
  vendor?: string
  reference?: string
  notes?: string
}) {
  const category = data.category as ExpenseCategory
  const subcategory =
    category === 'TRANSPORT' && data.subcategory
      ? (data.subcategory as ExpenseSubcategory)
      : null
  const costType =
    category === 'TRANSPORT'
      ? costTypeFromTransportSubcategory(subcategory) ?? (data.costType as ExpenseCostType)
      : (data.costType as ExpenseCostType)

  return {
    category,
    subcategory,
    costType,
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
    const classified = normalizeExpenseWrite(data)
    const expense = await prisma.expense.create({
      data: {
        userId: user.id,
        date: toDateOnly(data.date),
        category: classified.category,
        costType: classified.costType,
        subcategory: classified.subcategory,
        description: data.description.trim(),
        amount: prismaDecimal(data.amount),
        paymentMethod: data.paymentMethod as PaymentMethod,
        vendor: classified.vendor,
        reference: classified.reference,
        notes: classified.notes,
      },
    })
    revalidateExpensePaths()
    return ok({ id: expense.id }, 'Expense saved')
  } catch (error) {
    console.error('createExpenseAction', error)
    return fail('Unable to save expense')
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
    const classified = normalizeExpenseWrite(data)
    await prisma.expense.update({
      where: { id },
      data: {
        date: toDateOnly(data.date),
        category: classified.category,
        costType: classified.costType,
        subcategory: classified.subcategory,
        description: data.description.trim(),
        amount: prismaDecimal(data.amount),
        paymentMethod: data.paymentMethod as PaymentMethod,
        vendor: classified.vendor,
        reference: classified.reference,
        notes: classified.notes,
      },
    })
    revalidateExpensePaths()
    return ok({ id }, 'Expense updated')
  } catch (error) {
    console.error('updateExpenseAction', error)
    return fail('Unable to update expense')
  }
}

export async function deleteExpenseAction(id: string) {
  try {
    const { user } = await requireProfile()
    const existing = await prisma.expense.findFirst({ where: { id, userId: user.id } })
    if (!existing) return fail('Expense not found')
    await prisma.expense.delete({ where: { id } })
    revalidateExpensePaths()
    return ok({ id }, 'Expense deleted')
  } catch (error) {
    console.error('deleteExpenseAction', error)
    return fail('Unable to delete expense')
  }
}

export async function updateExpenseCostDefaultsAction(raw: unknown) {
  try {
    const { user } = await requireProfile()
    const { expenseCostDefaultsSchema } = await import('@/lib/validations/expense')
    const parsed = expenseCostDefaultsSchema.safeParse(raw)
    if (!parsed.success) return fail(parsed.error.issues[0]?.message || 'Invalid defaults')

    const defaults = parseExpenseCostDefaults(parsed.data.defaults)
    await prisma.userProfile.update({
      where: { id: user.id },
      data: { expenseCostDefaults: defaults as Prisma.InputJsonValue },
    })

    if (parsed.data.updateHistorical) {
      for (const [category, costType] of Object.entries(defaults)) {
        if (category === 'TRANSPORT') continue
        if (!costType) continue
        await prisma.expense.updateMany({
          where: { userId: user.id, category: category as ExpenseCategory },
          data: { costType, subcategory: null },
        })
      }
    }

    revalidatePath('/settings')
    revalidateExpensePaths()
    return ok(undefined, parsed.data.updateHistorical
      ? 'Cost defaults saved and historical expenses updated'
      : 'Cost defaults saved for new expenses')
  } catch (error) {
    console.error('updateExpenseCostDefaultsAction', error)
    return fail('Unable to save cost classification defaults')
  }
}
