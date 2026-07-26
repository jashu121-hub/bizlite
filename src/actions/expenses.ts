'use server'

import { revalidatePath } from 'next/cache'
import type {
  ExpenseCostType,
  InventoryDestination,
  PaymentMethod,
  Prisma,
} from '@prisma/client'
import { requireProfile } from '@/lib/auth'
import { fail, ok } from '@/lib/action-result'
import { prisma } from '@/lib/prisma'
import { moneyNumber, prismaDecimal } from '@/lib/money'
import { toDateOnly } from '@/lib/dates'
import { applyStockReceipt, tracksInventory } from '@/lib/services/inventory'
import { expenseSchema } from '@/lib/validations/expense'

function revalidateExpensePaths() {
  revalidatePath('/expenses')
  revalidatePath('/dashboard')
  revalidatePath('/reports')
  revalidatePath('/products')
  revalidatePath('/cash-bank')
}

async function normalizeExpenseWrite(
  userId: string,
  data: {
    categoryId: string
    costType: string
    vendor?: string
    reference?: string
    notes?: string
    productId?: string
    productionQuantity?: number
    productionUnit?: string
    productionUnitCost?: string
    inventoryDestination?: string
    productionBatch?: string
    updateInventory?: boolean
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

  const costType = (category.parentId && category.defaultCostType
    ? category.defaultCostType
    : data.costType) as ExpenseCostType

  const isProduction = costType === 'PRODUCTION'
  const productId = isProduction && data.productId ? data.productId : null
  if (productId) {
    const product = await prisma.product.findFirst({
      where: { id: productId, userId },
      select: { id: true },
    })
    if (!product) throw new Error('Related product was not found')
  }

  const updateInventory = Boolean(isProduction && data.updateInventory && productId)
  const destination =
    isProduction && data.inventoryDestination
      ? (data.inventoryDestination as InventoryDestination)
      : null

  return {
    categoryId: category.id,
    costType,
    vendor: data.vendor?.trim() || null,
    reference: data.reference?.trim() || null,
    notes: data.notes?.trim() || null,
    productId,
    productionQuantity: isProduction ? data.productionQuantity ?? null : null,
    productionUnit: isProduction ? data.productionUnit?.trim() || null : null,
    productionUnitCost:
      isProduction && data.productionUnitCost
        ? prismaDecimal(data.productionUnitCost)
        : null,
    inventoryDestination: destination,
    productionBatch: isProduction ? data.productionBatch?.trim() || null : null,
    updateInventory,
  }
}

async function applyInventoryFromProductionExpense(
  tx: Prisma.TransactionClient,
  input: {
    userId: string
    expenseId: string
    productId: string
    quantity: number
    unitCost: number | null
    expenseAmount: number
    date: Date
    description: string
    batch: string | null
  },
) {
  const product = await tx.product.findFirst({
    where: { id: input.productId, userId: input.userId },
  })
  if (!product) throw new Error('Related product was not found')
  if (!tracksInventory(product.productType)) {
    throw new Error('Services cannot receive inventory from expenses')
  }

  const qty = Math.max(0, Math.floor(input.quantity))
  if (qty <= 0) return

  const unitCost =
    input.unitCost != null && input.unitCost > 0
      ? input.unitCost
      : moneyNumber(prismaDecimal(input.expenseAmount).div(qty))

  await applyStockReceipt(tx, {
    userId: input.userId,
    productId: product.id,
    quantity: qty,
    unitCost,
    type: 'ADJUSTMENT_IN',
    date: input.date,
    reason: 'Production expense',
    reference: input.batch || input.expenseId,
    notes: `From expense: ${input.description}`,
  })
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
          productId: classified.productId,
          productionQuantity: classified.productionQuantity,
          productionUnit: classified.productionUnit,
          productionUnitCost: classified.productionUnitCost,
          inventoryDestination: classified.inventoryDestination,
          productionBatch: classified.productionBatch,
          updateInventory: classified.updateInventory,
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
      if (
        classified.updateInventory &&
        classified.productId &&
        classified.productionQuantity
      ) {
        await applyInventoryFromProductionExpense(tx, {
          userId: user.id,
          expenseId: created.id,
          productId: classified.productId,
          quantity: classified.productionQuantity,
          unitCost: classified.productionUnitCost
            ? moneyNumber(classified.productionUnitCost)
            : null,
          expenseAmount: Number(data.amount),
          date: toDateOnly(data.date),
          description: data.description.trim(),
          batch: classified.productionBatch,
        })
      }
      return created
    })
    revalidateExpensePaths()
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

    // Inventory updates on edit are not auto-reversed (would risk double stock).
    // Only apply when newly enabling updateInventory.
    const shouldApplyInventory =
      classified.updateInventory &&
      classified.productId &&
      classified.productionQuantity &&
      !existing.updateInventory

    await prisma.$transaction(async (tx) => {
      const priorCash = await tx.cashTransaction.findMany({
        where: { userId: user.id, expenseId: id },
      })
      for (const row of priorCash) {
        // Reverse signed amount (expense payments are negative → decrement negative = credit).
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
          productId: classified.productId,
          productionQuantity: classified.productionQuantity,
          productionUnit: classified.productionUnit,
          productionUnitCost: classified.productionUnitCost,
          inventoryDestination: classified.inventoryDestination,
          productionBatch: classified.productionBatch,
          updateInventory: classified.updateInventory,
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

      if (shouldApplyInventory && classified.productId && classified.productionQuantity) {
        await applyInventoryFromProductionExpense(tx, {
          userId: user.id,
          expenseId: id,
          productId: classified.productId,
          quantity: classified.productionQuantity,
          unitCost: classified.productionUnitCost
            ? moneyNumber(classified.productionUnitCost)
            : null,
          expenseAmount: Number(data.amount),
          date: toDateOnly(data.date),
          description: data.description.trim(),
          batch: classified.productionBatch,
        })
      }
    })
    revalidateExpensePaths()
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
