'use server'

import { revalidatePath } from 'next/cache'
import type { ExpenseCategory, PaymentMethod } from '@prisma/client'
import { requireProfile } from '@/lib/auth'
import { fail, ok } from '@/lib/action-result'
import { prisma } from '@/lib/prisma'
import { prismaDecimal } from '@/lib/money'
import { toDateOnly } from '@/lib/dates'
import { expenseSchema } from '@/lib/validations/expense'

export async function createExpenseAction(raw: unknown) {
  try {
    const { user } = await requireProfile()
    const parsed = expenseSchema.safeParse(raw)
    if (!parsed.success) return fail(parsed.error.issues[0]?.message || 'Invalid expense')
    const data = parsed.data
    const expense = await prisma.expense.create({
      data: {
        userId: user.id,
        date: toDateOnly(data.date),
        category: data.category as ExpenseCategory,
        description: data.description.trim(),
        amount: prismaDecimal(data.amount),
        paymentMethod: data.paymentMethod as PaymentMethod,
        notes: data.notes || null,
      },
    })
    revalidatePath('/expenses')
    revalidatePath('/dashboard')
    revalidatePath('/reports')
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
    await prisma.expense.update({
      where: { id },
      data: {
        date: toDateOnly(data.date),
        category: data.category as ExpenseCategory,
        description: data.description.trim(),
        amount: prismaDecimal(data.amount),
        paymentMethod: data.paymentMethod as PaymentMethod,
        notes: data.notes || null,
      },
    })
    revalidatePath('/expenses')
    revalidatePath('/dashboard')
    revalidatePath('/reports')
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
    revalidatePath('/expenses')
    revalidatePath('/dashboard')
    revalidatePath('/reports')
    return ok({ id }, 'Expense deleted')
  } catch (error) {
    console.error('deleteExpenseAction', error)
    return fail('Unable to delete expense')
  }
}
