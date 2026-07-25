'use server'

import { ensureProfile } from '@/lib/auth'
import { fail, ok, type ActionResult } from '@/lib/action-result'

export async function ensureProfileAction(
  userId: string,
  email: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    if (!userId || !email) {
      return fail('Missing user information')
    }

    const profile = await ensureProfile(userId, email)
    return ok({ id: profile.id }, 'Profile ready')
  } catch (error) {
    console.error('ensureProfileAction', error)
    return fail('Unable to create profile')
  }
}
