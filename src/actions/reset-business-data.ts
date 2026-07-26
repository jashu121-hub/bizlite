'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { fail, ok } from '@/lib/action-result'
import { requireProfile } from '@/lib/auth'
import {
  buildBusinessDataBackup,
  resetBusinessData,
  type ResetMode,
} from '@/lib/services/reset-business-data'

const resetSchema = z.object({
  mode: z.enum(['transactions', 'full']),
  confirmation: z
    .string()
    .refine((value) => value.trim() === 'RESET', 'Type RESET to confirm'),
  resetInvoiceNumbering: z.boolean().default(true),
  resetExpenseNumbering: z.boolean().default(true),
  resetProductSkuNumbering: z.boolean().default(false),
  keepDefaultSystemCategories: z.boolean().default(true),
})

function revalidateAllBusinessPaths() {
  const paths = [
    '/dashboard',
    '/sales',
    '/sales/new',
    '/expenses',
    '/products',
    '/customers',
    '/cash-bank',
    '/reports',
    '/cost-pricing',
    '/settings',
  ]
  for (const path of paths) revalidatePath(path)
}

export async function exportBusinessBackupAction() {
  try {
    const { user } = await requireProfile()
    const backup = await buildBusinessDataBackup(user.id)
    return ok(backup, 'Backup ready')
  } catch (error) {
    console.error('exportBusinessBackupAction', error)
    return fail('Unable to export backup')
  }
}

export async function resetBusinessDataAction(raw: unknown) {
  try {
    const { user } = await requireProfile()
    const parsed = resetSchema.safeParse(raw)
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message || 'Invalid reset request')
    }

    const data = parsed.data
    const validation = await resetBusinessData(user.id, {
      mode: data.mode as ResetMode,
      resetInvoiceNumbering: data.resetInvoiceNumbering,
      resetExpenseNumbering: data.resetExpenseNumbering,
      resetProductSkuNumbering: data.resetProductSkuNumbering,
      keepDefaultSystemCategories: data.keepDefaultSystemCategories,
    })

    revalidateAllBusinessPaths()

    if (!validation.ok) {
      console.warn('[reset] Post-reset validation incomplete', {
        userId: user.id,
        mode: data.mode,
        validation,
      })
      return ok(
        { validation, mode: data.mode },
        'Business data was reset, but some validation checks need review. Refresh the dashboard.',
      )
    }

    return ok(
      { validation, mode: data.mode },
      'Business data reset successfully. BizLite 2026 is ready for fresh data.',
    )
  } catch (error) {
    console.error('resetBusinessDataAction', error)
    return fail(
      error instanceof Error
        ? error.message
        : 'Unable to reset business data. No partial changes should remain — try again.',
    )
  }
}
