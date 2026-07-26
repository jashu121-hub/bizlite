'use server'

import { revalidatePath } from 'next/cache'
import { requireUser, ensureProfile } from '@/lib/auth'
import { fail, ok } from '@/lib/action-result'
import { prisma } from '@/lib/prisma'
import { setupSchema } from '@/lib/validations/auth'
import { z } from 'zod'

const settingsSchema = z.object({
  businessName: z.string().min(1).max(120),
  ownerName: z.string().min(1).max(120),
  phone: z.string().max(40).optional().or(z.literal('')),
  currency: z.string().min(3).max(3),
  costingMode: z.enum(['INVENTORY', 'SIMPLE']).optional(),
})

export async function completeSetupAction(raw: unknown) {
  try {
    const user = await requireUser()
    const parsed = setupSchema.safeParse(raw)
    if (!parsed.success) return fail(parsed.error.issues[0]?.message || 'Invalid setup data')
    await ensureProfile(user.id, user.email ?? '')
    await prisma.userProfile.update({
      where: { id: user.id },
      data: {
        businessName: parsed.data.businessName.trim(),
        ownerName: parsed.data.ownerName.trim(),
        phone: parsed.data.phone || null,
        currency: parsed.data.currency || 'AED',
        setupCompleted: true,
      },
    })
    revalidatePath('/dashboard')
    revalidatePath('/settings')
    return ok(undefined, 'Business setup complete')
  } catch (error) {
    console.error('completeSetupAction', error)
    return fail('Unable to complete setup')
  }
}

export async function updateSettingsAction(raw: unknown) {
  try {
    const user = await requireUser()
    const parsed = settingsSchema.safeParse(raw)
    if (!parsed.success) return fail(parsed.error.issues[0]?.message || 'Invalid settings')
    const profile = await prisma.userProfile.findUnique({ where: { id: user.id } })
    if (!profile) return fail('Profile not found')
    await prisma.userProfile.update({
      where: { id: user.id },
      data: {
        businessName: parsed.data.businessName.trim(),
        ownerName: parsed.data.ownerName.trim(),
        phone: parsed.data.phone || null,
        currency: parsed.data.currency,
        ...(parsed.data.costingMode ? { costingMode: parsed.data.costingMode } : {}),
      },
    })
    revalidatePath('/settings')
    revalidatePath('/dashboard')
    revalidatePath('/reports')
    return ok(undefined, 'Settings saved')
  } catch (error) {
    console.error('updateSettingsAction', error)
    return fail('Unable to save settings')
  }
}
