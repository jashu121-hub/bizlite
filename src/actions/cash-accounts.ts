'use server'

import { revalidatePath } from 'next/cache'
import { requireProfile } from '@/lib/auth'
import { fail, ok } from '@/lib/action-result'
import {
  balanceAdjustmentSchema,
  createCashAccountSchema,
  moneyMovementSchema,
  startingBalanceSchema,
  transferSchema,
  updateCashAccountSchema,
} from '@/lib/validations/cash-account'
import {
  addStartingBalance,
  adjustAccountBalance,
  createCashAccount,
  recordMoneyIn,
  recordMoneyOut,
  setCashAccountActive,
  transferBetweenAccounts,
  updateCashAccount,
} from '@/lib/services/cash-accounts'

function revalidateCash(accountId?: string) {
  revalidatePath('/cash-bank')
  revalidatePath('/dashboard')
  if (accountId) {
    revalidatePath(`/cash-bank/${accountId}`)
    revalidatePath(`/cash-bank/${accountId}/edit`)
  }
}

export async function createCashAccountAction(raw: unknown) {
  try {
    const { user } = await requireProfile()
    const parsed = createCashAccountSchema.safeParse(raw)
    if (!parsed.success) return fail(parsed.error.issues[0]?.message || 'Invalid account data')
    const account = await createCashAccount(user.id, parsed.data)
    revalidateCash(account.id)
    return ok({ id: account.id }, 'Account created')
  } catch (error) {
    console.error('createCashAccountAction', error)
    return fail(error instanceof Error ? error.message : 'Unable to create account')
  }
}

export async function updateCashAccountAction(id: string, raw: unknown) {
  try {
    const { user } = await requireProfile()
    const parsed = updateCashAccountSchema.safeParse(raw)
    if (!parsed.success) return fail(parsed.error.issues[0]?.message || 'Invalid account data')
    const account = await updateCashAccount(user.id, id, parsed.data)
    revalidateCash(account.id)
    return ok({ id: account.id }, 'Account updated')
  } catch (error) {
    console.error('updateCashAccountAction', error)
    return fail(error instanceof Error ? error.message : 'Unable to update account')
  }
}

export async function setCashAccountActiveAction(id: string, isActive: boolean) {
  try {
    const { user } = await requireProfile()
    const account = await setCashAccountActive(user.id, id, isActive)
    revalidateCash(account.id)
    return ok({ id: account.id }, isActive ? 'Account activated' : 'Account marked inactive')
  } catch (error) {
    console.error('setCashAccountActiveAction', error)
    return fail(error instanceof Error ? error.message : 'Unable to update account status')
  }
}

export async function addStartingBalanceAction(raw: unknown) {
  try {
    const { user } = await requireProfile()
    const parsed = startingBalanceSchema.safeParse(raw)
    if (!parsed.success) return fail(parsed.error.issues[0]?.message || 'Invalid starting balance')
    await addStartingBalance(user.id, parsed.data)
    revalidateCash(parsed.data.accountId)
    return ok(undefined, 'Starting balance added')
  } catch (error) {
    console.error('addStartingBalanceAction', error)
    return fail(error instanceof Error ? error.message : 'Unable to add starting balance')
  }
}

export async function recordMoneyInAction(raw: unknown) {
  try {
    const { user } = await requireProfile()
    const parsed = moneyMovementSchema.safeParse(raw)
    if (!parsed.success) return fail(parsed.error.issues[0]?.message || 'Invalid amount')
    await recordMoneyIn(user.id, parsed.data)
    revalidateCash(parsed.data.accountId)
    return ok(undefined, 'Money in recorded')
  } catch (error) {
    console.error('recordMoneyInAction', error)
    return fail(error instanceof Error ? error.message : 'Unable to record money in')
  }
}

export async function recordMoneyOutAction(raw: unknown) {
  try {
    const { user } = await requireProfile()
    const parsed = moneyMovementSchema.safeParse(raw)
    if (!parsed.success) return fail(parsed.error.issues[0]?.message || 'Invalid amount')
    await recordMoneyOut(user.id, parsed.data)
    revalidateCash(parsed.data.accountId)
    return ok(undefined, 'Money out recorded')
  } catch (error) {
    console.error('recordMoneyOutAction', error)
    return fail(error instanceof Error ? error.message : 'Unable to record money out')
  }
}

export async function transferCashAction(raw: unknown) {
  try {
    const { user } = await requireProfile()
    const parsed = transferSchema.safeParse(raw)
    if (!parsed.success) return fail(parsed.error.issues[0]?.message || 'Invalid transfer')
    await transferBetweenAccounts(user.id, parsed.data)
    revalidateCash(parsed.data.fromAccountId)
    revalidateCash(parsed.data.toAccountId)
    return ok(undefined, 'Transfer completed')
  } catch (error) {
    console.error('transferCashAction', error)
    return fail(error instanceof Error ? error.message : 'Unable to transfer')
  }
}

export async function adjustCashBalanceAction(raw: unknown) {
  try {
    const { user } = await requireProfile()
    const parsed = balanceAdjustmentSchema.safeParse(raw)
    if (!parsed.success) return fail(parsed.error.issues[0]?.message || 'Invalid adjustment')
    await adjustAccountBalance(user.id, parsed.data)
    revalidateCash(parsed.data.accountId)
    return ok(undefined, 'Balance adjusted')
  } catch (error) {
    console.error('adjustCashBalanceAction', error)
    return fail(error instanceof Error ? error.message : 'Unable to adjust balance')
  }
}
