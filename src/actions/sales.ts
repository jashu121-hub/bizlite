'use server'

import { revalidatePath } from 'next/cache'
import { requireProfile } from '@/lib/auth'
import { fail, ok } from '@/lib/action-result'
import { saleSchema } from '@/lib/validations/sale'
import {
  createSaleTransaction,
  deleteSaleTransaction,
  updateSaleTransaction,
} from '@/lib/services/sales'

export async function createSaleAction(raw: unknown) {
  try {
    const { user } = await requireProfile()
    const parsed = saleSchema.safeParse(raw)
    if (!parsed.success) return fail(parsed.error.issues[0]?.message || 'Invalid sale data')
    const sale = await createSaleTransaction(user.id, parsed.data)
    revalidatePath('/sales')
    revalidatePath('/dashboard')
    revalidatePath('/products')
    revalidatePath('/reports')
    revalidatePath('/cash-bank')
    return ok({ id: sale.id }, 'Sale created')
  } catch (error) {
    console.error('createSaleAction', error)
    return fail(error instanceof Error ? error.message : 'Unable to create sale')
  }
}

export async function updateSaleAction(id: string, raw: unknown) {
  try {
    const { user } = await requireProfile()
    const parsed = saleSchema.safeParse(raw)
    if (!parsed.success) return fail(parsed.error.issues[0]?.message || 'Invalid sale data')
    const sale = await updateSaleTransaction(user.id, id, parsed.data)
    revalidatePath('/sales')
    revalidatePath(`/sales/${id}`)
    revalidatePath('/dashboard')
    revalidatePath('/products')
    revalidatePath('/reports')
    revalidatePath('/cash-bank')
    return ok({ id: sale.id }, 'Sale updated')
  } catch (error) {
    console.error('updateSaleAction', error)
    return fail(error instanceof Error ? error.message : 'Unable to update sale')
  }
}

export async function deleteSaleAction(id: string) {
  try {
    const { user } = await requireProfile()
    await deleteSaleTransaction(user.id, id)
    revalidatePath('/sales')
    revalidatePath('/dashboard')
    revalidatePath('/products')
    revalidatePath('/reports')
    revalidatePath('/cash-bank')
    return ok({ id }, 'Sale deleted')
  } catch (error) {
    console.error('deleteSaleAction', error)
    return fail(error instanceof Error ? error.message : 'Unable to delete sale')
  }
}
