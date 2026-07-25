'use server'

import { revalidatePath } from 'next/cache'
import type { PaymentMethod } from '@prisma/client'
import { requireProfile } from '@/lib/auth'
import { fail, ok } from '@/lib/action-result'
import { prisma } from '@/lib/prisma'
import { determinePaymentStatus, money, prismaDecimal, subMoney } from '@/lib/money'
import { toDateOnly } from '@/lib/dates'
import { customerPaymentSchema, customerSchema } from '@/lib/validations/customer'

export async function createCustomerAction(raw: unknown) {
  try {
    const { user } = await requireProfile()
    const parsed = customerSchema.safeParse(raw)
    if (!parsed.success) return fail(parsed.error.issues[0]?.message || 'Invalid customer')
    const data = parsed.data
    const customer = await prisma.customer.create({
      data: {
        userId: user.id,
        name: data.name.trim(),
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        notes: data.notes || null,
      },
    })
    revalidatePath('/customers')
    revalidatePath('/dashboard')
    return ok({ id: customer.id }, 'Customer created')
  } catch (error) {
    console.error('createCustomerAction', error)
    return fail('Unable to create customer')
  }
}

export async function updateCustomerAction(id: string, raw: unknown) {
  try {
    const { user } = await requireProfile()
    const parsed = customerSchema.safeParse(raw)
    if (!parsed.success) return fail(parsed.error.issues[0]?.message || 'Invalid customer')
    const existing = await prisma.customer.findFirst({ where: { id, userId: user.id } })
    if (!existing) return fail('Customer not found')
    const data = parsed.data
    await prisma.customer.update({
      where: { id },
      data: {
        name: data.name.trim(),
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        notes: data.notes || null,
      },
    })
    revalidatePath('/customers')
    revalidatePath(`/customers/${id}`)
    return ok({ id }, 'Customer updated')
  } catch (error) {
    console.error('updateCustomerAction', error)
    return fail('Unable to update customer')
  }
}

export async function deleteCustomerAction(id: string) {
  try {
    const { user } = await requireProfile()
    const existing = await prisma.customer.findFirst({ where: { id, userId: user.id } })
    if (!existing) return fail('Customer not found')
    await prisma.customer.delete({ where: { id } })
    revalidatePath('/customers')
    revalidatePath('/dashboard')
    return ok({ id }, 'Customer deleted')
  } catch (error) {
    console.error('deleteCustomerAction', error)
    return fail('Unable to delete customer')
  }
}

export async function recordCustomerPaymentAction(raw: unknown) {
  try {
    const { user } = await requireProfile()
    const parsed = customerPaymentSchema.safeParse(raw)
    if (!parsed.success) return fail(parsed.error.issues[0]?.message || 'Invalid payment')
    const data = parsed.data
    const amount = money(data.amount)
    if (amount.lte(0)) return fail('Payment amount must be greater than zero')

    await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findFirst({
        where: { id: data.customerId, userId: user.id },
      })
      if (!customer) throw new Error('Customer not found')

      const saleId: string | null = data.saleId || null
      if (saleId) {
        const sale = await tx.sale.findFirst({
          where: { id: saleId, userId: user.id, customerId: customer.id },
        })
        if (!sale) throw new Error('Sale not found')
        const remaining = money(sale.balancePending)
        if (amount.gt(remaining)) throw new Error('Payment exceeds pending balance')
        const newPaid = money(sale.amountPaid).plus(amount)
        const newBalance = subMoney(sale.totalAmount, newPaid)
        await tx.sale.update({
          where: { id: sale.id },
          data: {
            amountPaid: prismaDecimal(newPaid),
            balancePending: prismaDecimal(newBalance),
            paymentStatus: determinePaymentStatus(sale.totalAmount, newPaid),
          },
        })
      }

      await tx.customerPayment.create({
        data: {
          userId: user.id,
          customerId: customer.id,
          saleId,
          date: toDateOnly(data.date),
          amount: prismaDecimal(amount),
          paymentMethod: data.paymentMethod as PaymentMethod,
          notes: data.notes || (saleId ? null : 'Unallocated customer payment'),
        },
      })
    })

    revalidatePath('/customers')
    revalidatePath(`/customers/${data.customerId}`)
    revalidatePath('/sales')
    revalidatePath('/dashboard')
    revalidatePath('/reports')
    return ok(undefined, 'Payment recorded')
  } catch (error) {
    console.error('recordCustomerPaymentAction', error)
    return fail(error instanceof Error ? error.message : 'Unable to record payment')
  }
}
